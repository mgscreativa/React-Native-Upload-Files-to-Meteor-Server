import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Meteor, { withTracker } from 'react-native-meteor';
import { ScreenOrientation } from 'expo';
import { View, Image, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { DocumentPicker, ImagePicker, Camera, Permissions } from 'expo';
import mime from 'react-native-mime-types';
import { create } from 'apisauce';

import config from './config/config';
import CustomButton from './components/CustomButton';
import Login from './screens/Login';
import uploadPOST from './helpers/uploads';

ScreenOrientation.allow(ScreenOrientation.Orientation.PORTRAIT);

Meteor.connect(
  process.env.NODE_ENV !== 'development'
    ? config.prodServerUrl
    : config.devServerUrl,
);

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      progress: 0,
      loading: false,
      data: null,
      canSend: false,
      hasCameraPermission: null,
      cameraViewportDimensions: {},
      authToken: null,
    };

    this.baseURL =
      process.env.NODE_ENV !== 'development'
        ? config.prodServerBaseURL
        : config.devServerBaseURL;
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

  componentWillReceiveProps(nextProps) {
    if (Meteor.userId() && nextProps.authToken !== Meteor.getAuthToken()) {
      this.setState({ authToken: Meteor.getAuthToken() });
    }
  }

  sendThroughMethod = () => {
    const { data } = this.state;

    this.setState({ loading: true });

    if (!data) {
      alert('Nothing to send');
      this.resetSendSatate();
      return;
    }

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
      },
    );

    this.resetSendSatate();
  };

  sendThroughPOST = () => {
    const { data, authToken } = this.state;

    this.setState({ loading: true });

    if (!data) {
      alert('Nothing to send');
      this.resetSendSatate();
      return;
    }

    const fileExtension = data.uri.match(/[0-9a-z]+$/i)[0];
    const formData = new FormData();

    formData.append('authToken', authToken);
    formData.append('file', {
      // If data doesn't have name property, then is an image, grabbed or taken
      name: data.name ? data.name : `image.${fileExtension}`,
      uri: data.uri,
      type: mime.lookup(fileExtension),
    });

    uploadPOST(`${this.baseURL}/api/v1/uploads`, {
      method: 'post',
      body: formData,
      onProgress: event => {
        const progress = event.loaded / event.total;

        console.log(progress);

        this.setState({
          progress: progress,
        });
      },
    }).then(
      res => {
        console.log(res);
        this.resetSendSatate();
      },
      err => {
        console.log(err);
        this.resetSendSatate();
      },
    );
  };

  sendThroughApisaucePOST = () => {
    const { data, authToken } = this.state;

    this.setState({ loading: true });

    if (!data) {
      alert('Nothing to send');
      this.resetSendSatate();
      return;
    }

    const fileExtension = data.uri.match(/[0-9a-z]+$/i)[0];
    const formData = new FormData();
    const api = create({
      baseURL: this.baseURL,
    });

    formData.append('authToken', authToken);
    formData.append('file', {
      // If data doesn't have name property, then is an image, grabbed or taken
      name: data.name ? data.name : `image.${fileExtension}`,
      uri: data.uri,
      type: mime.lookup(fileExtension),
    });

    api
      .post('/api/v1/uploads', formData, {
        onUploadProgress: event => {
          const progress = event.loaded / event.total;

          console.log(progress);

          this.setState({
            progress,
          });
        },
      })
      .then(
        res => {
          console.log(res);
          this.resetSendSatate();
        },
        err => {
          console.log(err);
          this.resetSendSatate();
        },
      );
  };

  readUriToBase64 = async file => {
    this.setState({ loading: true });

    await fetch(file.uri)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();

        reader.readAsDataURL(blob);
        // reader.readAsBinaryString(blob); // Not Implemented in RN
        // reader.readAsArrayBuffer(blob);  // Not Implemented in RN
        reader.onload = () => {
          this.setState({
            data: { ...file, data: reader.result },
            canSend: true,
            loading: false,
          });
        };
      })
      .catch(error => console.error(error));
  };

  getCameraViewport = () => {
    const { hasCameraPermission, loading, progress, canSend } = this.state;
    let cameraInner = null;

    if (hasCameraPermission === null) {
      cameraInner = <Text>No puedo acceder a la cámara!</Text>;
    } else if (hasCameraPermission === false) {
      cameraInner = <Text>No tengo permiso de acceder a tu cámara!</Text>;
    } else if (loading && canSend) {
      cameraInner = (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="large" />
          <Text>{parseFloat(progress * 100).toFixed(2) + '%'}</Text>
        </View>
      );
    }

    return (
      <View
        style={styles.cameraViewport}
        onLayout={event => {
          this.setState({
            cameraViewportDimensions: event.nativeEvent.layout,
          });
        }}
      >
        {cameraInner ? cameraInner : this.getCamera()}
      </View>
    );
  };

  getCamera = () => {
    const { data, loading } = this.state;

    if (loading) {
      return (
        <View>
          <ActivityIndicator size="large" />
        </View>
      );
    } else if (data && data.width && data.height) {
      return (
        <Image
          resizeMode="contain"
          width={this.state.cameraViewportDimensions.width}
          height={this.state.cameraViewportDimensions.height}
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

  resetSendSatate = () => {
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

  handleLogin = (email, password) => {
    if (email.length === 0) {
      alert('Need email to login!');
    }

    if (password.length === 0) {
      alert('Need password to login!');
    }

    this.setState({ loading: true });
    return Meteor.loginWithPassword(email, password, error => {
      this.setState({ loading: false });
      if (error) {
        alert(`Error de login: ${error.message}`);
      }
    });
  };

  handleLogout = () => {
    Meteor.logout(error => {
      if (error) {
        alert(`Error de logout: ${error.message}`);
      }

      this.setState({ authToken: null });
    });
  };

  render() {
    const { loggingIn, authenticated } = this.props;

    if (loggingIn || !authenticated) {
      return (
        <Login handleLogin={this.handleLogin} loading={this.state.loading} />
      );
    }

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

          <CustomButton text="Reset" onPress={this.resetSendSatate} />
        </View>

        <View style={styles.buttons}>
          <CustomButton
            text="Send through Method"
            onPress={this.sendThroughMethod}
            disabled={!this.state.canSend}
          />
        </View>

        <View style={styles.buttons}>
          <CustomButton
            text="Send through POST"
            onPress={this.sendThroughPOST}
            disabled={!this.state.canSend}
          />
        </View>

        <View style={styles.buttons}>
          <CustomButton
            text="Send through Apisauce POST"
            onPress={this.sendThroughApisaucePOST}
            disabled={!this.state.canSend}
          />
        </View>

        <View style={styles.buttons}>
          <CustomButton
            text="Logout"
            onPress={this.handleLogout}
            disabled={Meteor.userId() === ''}
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
  progressContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
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

App.propTypes = {
  loggingIn: PropTypes.bool,
  authenticated: PropTypes.bool,
};

export default withTracker(() => {
  const loggingIn = Meteor.loggingIn();

  return {
    loggingIn,
    authenticated: !loggingIn && !!Meteor.userId(),
  };
})(App);
