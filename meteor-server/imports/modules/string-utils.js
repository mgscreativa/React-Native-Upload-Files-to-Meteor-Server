import latinize from 'latinize';

const capitalizeFirstWords = string =>
  string ? string.charAt(0).toUpperCase() + string.slice(1) : '';

const capitalizeAll = string => (string ? string.toUpperCase() : '');

const createSlug = string =>
  string ? latinize(string.trim().toLowerCase()).replace(/\s+/g, '-') : '';

const removeFileExtension = string =>
  string ? string.replace(/\.[^/.]+$/, '') : '';

const getFileTypeFromMime = string =>
  string ? string.replace(/\/[^\/]+$/, '') : '';

export {
  capitalizeFirstWords,
  capitalizeAll,
  createSlug,
  removeFileExtension,
  getFileTypeFromMime,
};
