import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, TextInput, StyleSheet } from 'react-native';

import CustomButton from '../components/CustomButton';

class Login extends Component {
  constructor(props) {
    super(props);

    this.state = {
      email: '',
      password: '',
    };
  }

  render() {
    return (
      <View style={styles.container}>
        <TextInput
          style={styles.textInput}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={emailOrUsername =>
            this.setState({ email: emailOrUsername })
          }
          value={this.state.email}
        />

        <TextInput
          style={styles.textInput}
          placeholder="Password"
          autoCapitalize="none"
          secureTextEntry
          onChangeText={password => this.setState({ password })}
          value={this.state.password}
        />

        <CustomButton
          text="Login"
          onPress={() =>
            this.props.handleLogin(this.state.email, this.state.password)
          }
          disabled={this.props.loading}
        />
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
  textInput: {
    width: '90%',
    height: 48,
    fontSize: 18,
    paddingHorizontal: 8,
    marginVertical: 11,
    color: '#777',
    borderColor: '#555',
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#DDD',
  },
});

Login.propTypes = {
  loading: PropTypes.bool,
  handleLogin: PropTypes.func,
};

export default Login;
