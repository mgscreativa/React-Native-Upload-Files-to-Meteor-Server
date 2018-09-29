import React from 'react';
import PropTypes from 'prop-types';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';

const CustomButton = ({ text, onPress, disabled }) => (
  <TouchableOpacity
    style={styles.buttonWrapper}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={disabled ? styles.buttonTextDisabled : {}}>{text}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  buttonWrapper: {
    flexDirection: 'row',
    margin: 5,
    height: 48,
    paddingHorizontal: 10,
    borderRadius: 4 * 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#bbb',
    backgroundColor: '#ccc',
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonTextDisabled: {
    color: '#999',
  },
});

CustomButton.propTypes = {
  onPress: PropTypes.func,
  text: PropTypes.string,
  disabled: PropTypes.bool,
};

export default CustomButton;
