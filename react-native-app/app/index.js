import React, { Component } from 'react';
import Meteor from 'react-native-meteor';
import { ScreenOrientation } from 'expo';
import { View, Image, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  DocumentPicker,
  ImagePicker,
  Camera,
  Permissions,
} from 'expo';
import * as mime from 'react-native-mime-types';

import CustomButton from './CustomButton';

ScreenOrientation.allow(ScreenOrientation.Orientation.PORTRAIT);

Meteor.connect('ws://10.0.0.2:3000/websocket');

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      data: null,
      canSend: false,
      hasCameraPermission: null,
      cammeraViewportDimmensions: {},
    };
  }

  componentDidMount() {
    Permissions.askAsync(Permissions.CAMERA, Permissions.CAMERA_ROLL)
      .then(status => {
        this.setState({ hasCameraPermission: status.status === 'granted' });
      })
      .catch(error => {
        alert(`No tengo acceso a la cámara! ${error}`);
      });
  }

  handleSendFileToMeteor = () => {
    const { data } = this.state;

    this.setState({ loading: true });

    if (!data) {
      alert('Nothing to send');
      return;
    }

    if (data) {
      console.log('[handleSendFileToMeteor] data to upload', data);

      Meteor.call(
        'files.insert',
        {
          // If data doesn't have name property, then is an image, grabbed or taken
          fileName: data.name
            ? data.name
            : `image.${mime.extension(
                data.base64.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)[0],
              )}`,
          base64DataURI: data.base64,
          userId: Meteor.userId(),
        },
        error => {
          if (error) {
            console.log(error);
          }

          this.resetSatate();
        },
      );
    }
  };

  readUriToBase64 = async file => {
    this.setState({ loading: true });

    await fetch(file.uri)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();

        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          this.setState({
            data: { ...file, base64: reader.result },
            canSend: true,
            loading: false,
          });
        };
      })
      .catch(error => console.error(error));
  };

  getCameraViewport = () => {
    const { hasCameraPermission } = this.state;

    if (hasCameraPermission === null) {
      return (
        <View style={styles.cameraViewport}>
          <Text>No puedo acceder a la cámara!</Text>
        </View>
      );
    } else if (hasCameraPermission === false) {
      return (
        <View style={styles.cameraViewport}>
          <Text>No tengo permiso de acceder a tu cámara!</Text>
        </View>
      );
    }

    return (
      <View
        style={styles.cameraViewport}
        onLayout={event => {
          this.setState({
            cammeraViewportDimmensions: event.nativeEvent.layout,
          });
        }}
      >
        {this.getCamera()}
      </View>
    );
  };

  getCamera = () => {
    const { data, loading } = this.state;

    if (loading) {
      return (
        <ActivityIndicator
          size="large"
          color={styles.$activityIndicatorColor}
        />
      );
    } else if (data && data.width && data.height) {
      return (
        <Image
          resizeMode="contain"
          width={this.state.cammeraViewportDimmensions.width}
          height={this.state.cammeraViewportDimmensions.height}
          source={{ uri: data.uri }}
          style={styles.cameraContainer}
        />
      );
    } else {
      return (
        <Camera
          ref={ref => {
            this.cameraRef = ref;
          }}
          style={styles.cameraContainer}
          type={Camera.Constants.Type.back}
          flashMode={'auto'}
          autoFocus={'on'}
        />
      );
    }
  };

  resetSatate = () => {
    this.setState({
      data: null,
      canSend: false,
      loading: false,
    });
  };

  takePicture = async () => {
    if (this.cameraRef) {
      this.cameraRef
        .takePictureAsync({
          quality: 0.9,
          base64: true,
          exif: true,
        })
        .then(image => {
          this.readUriToBase64(image);
        })
        .catch(error => {
          alert(`No tengo acceso a la cámara! ${error}`);
        });
    }
  };

  pickDocument = async () => {
    const document = await DocumentPicker.getDocumentAsync({});

    if (document.type === 'success') {
      this.readUriToBase64(document);
    }
  };

  pickImage = async () => {
    let image = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.9,
      base64: true,
      exif: true,
    });

    if (!image.cancelled) {
      this.readUriToBase64(image);
    }
  };

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Take a picture or grab a file</Text>
        </View>

        {this.getCameraViewport()}

        <View style={styles.buttons}>
          <CustomButton
            text="Take Picture"
            onPress={this.takePicture}
            disabled={this.state.canSend}
          />
          <CustomButton
            text="Grab Picture"
            onPress={this.pickImage}
            disabled={this.state.canSend}
          />
          <CustomButton
            text="Grab File"
            onPress={this.pickDocument}
            disabled={this.state.canSend}
          />
        </View>

        <View style={styles.buttons}>
          <CustomButton text="Reset" onPress={this.resetSatate} />
          <CustomButton
            text="Send to meteor"
            onPress={this.handleSendFileToMeteor}
            disabled={!this.state.canSend}
          />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  header: {
    paddingVertical: 10,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D57A66',
  },
  cameraViewport: {
    flex: 15,
    flexDirection: 'column',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  cameraContainer: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
