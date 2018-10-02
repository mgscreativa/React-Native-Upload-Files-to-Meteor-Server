const uploadPOST = (url, opts = {}) => {
  console.log(url, opts);

  return new Promise((res, rej) => {
    var xhr = new XMLHttpRequest();
    xhr.open(opts.method || 'get', url);

    for (var k in opts.headers || {}) {
      xhr.setRequestHeader(k, opts.headers[k]);
    }

    xhr.onload = e => res(e.target);
    xhr.onerror = rej;

    if (
      xhr.upload &&
      opts.onProgress &&
      typeof opts.onProgress === 'function'
    ) {
      xhr.upload.onprogress = opts.onProgress;
    }

    xhr.send(opts.body);
  });
};

export default uploadPOST;
