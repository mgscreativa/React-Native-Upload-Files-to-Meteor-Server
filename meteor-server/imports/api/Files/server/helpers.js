import "isomorphic-fetch";
import _ from "lodash";
import { Meteor } from "meteor/meteor";
import request from "request";
import { Dropbox } from "dropbox";
import fs from "fs-extra";

import { createSlug, removeFileExtension } from "../../../modules/string-utils";

const bound = Meteor.bindEnvironment(callback => callback());
const dbx = new Dropbox({ accessToken: Meteor.settings.private.DROPBOX_TOKEN });
const dropboxPrefix = Meteor.isDevelopment ? "/development" : "/production";

const debug = true;

const makeUrl = (path, fileRef, version, self) => {
  dbx
    .sharingCreateSharedLinkWithSettings({
      path
    })
    .then(response => {
      bound(() => {
        const upd = {
          $set: {}
        };

        upd.$set[`versions.${version}.meta.pipeFrom`] = response.url.replace(
          "dl=0",
          "raw=1"
        );
        upd.$set[`versions.${version}.meta.pipePath`] = path;

        self.update({ _id: fileRef._id }, upd, error => {
          if (error) {
            throw new Meteor.Error("500", `[onAfterUpload - makeUrl] ${error}`);
          }

          if (debug) {
            console.log("[onAfterUpload - makeUrl] File uploaded to storage");
          }

          self.unlink(self.findOne(fileRef._id), version);
        });
      });
    })
    .catch(err => {
      console.error(err);
    });
};

const getUploadPath = fileRef => {
  return fileRef.meta.uploadFolder
    ? `${dropboxPrefix}/${fileRef.meta.uploadFolder}`
    : dropboxPrefix;
};

const writeToDB = (fileRef, version, data, self) => {
  dbx
    .filesUpload({
      path: `${getUploadPath(fileRef)}/${fileRef.meta.name}-${
        fileRef._id
      }-${version}.${fileRef.extension}`,
      contents: data,
      autorename: false
    })
    .then(response => {
      bound(() => {
        makeUrl(response.path_display, fileRef, version, self);
      });
    })
    .catch(err => {
      bound(() => {
        console.error(err);
      });
    });
};

const readFile = (fileRef, vRef, version, self) => {
  fs.readFile(vRef.path, (error, data) => {
    bound(() => {
      if (error) {
        return console.error(error);
      }

      writeToDB(fileRef, version, data, self);
    });
  });
};

const sendToStorage = (fileRef, self) => {
  _.each(fileRef.versions, (vRef, version) => {
    readFile(fileRef, vRef, version, self);
  });
};

const onBeforeUpload = file => {
  if (debug) {
    console.log("[onBeforeUpload] Init", file);
  }

  if (!RegExp(Meteor.settings.public.allowedUploadFormats, "i").test(file.extension)) {
    return `${file.extension} files are not allowed for upload.`;
  }

  if (file.meta.userId === Meteor.userId()) {
    if (debug) {
      console.log("[onBeforeUpload] File upload granted");
    }

    return true;
  }

  if (debug) {
    console.log("[onBeforeUpload] File upload denied, wrong format");
  }

  return false;
};

const onAfterUpload = (fileRef, self) => {
  if (debug) {
    console.log("[onAfterUpload] Init");
  }

  try {
    const dest = {
      meta: {},
      path: fileRef.path,
      extension: fileRef.extension,
      type: fileRef.mime
    };

    if (!RegExp(Meteor.settings.public.allowedUploadFormats, "i").test(fileRef.extension)) {
      throw new Meteor.Error(
        "403",
        `${fileRef.extension} files are not allowed for upload.`
      );
    }

    dest.meta = {
      ..._.omit(fileRef.meta, ["shouldResize"]),
      createdAt: new Date(),
      name: createSlug(removeFileExtension(fileRef.name)),
      width: fileRef.width,
      height: fileRef.height,
      downloads: 0
    };

    dest["versions.original"] = _.clone(dest);

    self.update(fileRef._id, { $set: dest });

    const fileRefToSend = fileRef;
    fileRefToSend.size = dest.size;
    fileRefToSend.type = dest.type;
    fileRefToSend.meta = dest.meta;
    fileRefToSend.versions.original = dest;

    if (debug) {
      console.log("[onAfterUpload] Sending file to storage");
    }
    sendToStorage(fileRefToSend, self);
  } catch (exception) {
    self.remove({ _id: fileRef._id }, error => {
      if (error) {
        console.log(error);
      }
    });

    if (exception.error) {
      throw new Meteor.Error(
        exception.error,
        `[onAfterUpload] ${exception.reason}`
      );
    }

    throw new Meteor.Error("500", `[onAfterUpload] ${exception}`);
  }
};

const onAfterRemove = cursor => {
  if (debug) {
    console.log("[onAfterRemove] Init");
  }

  try {
    cursor.forEach(fileRef => {
      _.each(fileRef.versions, vRef => {
        if (vRef && vRef.meta && vRef.meta.pipePath) {
          if (debug) {
            console.log("[onAfterRemove] Trying to delete file from DropBox");
          }

          dbx
            .filesSearch({ path: getUploadPath(fileRef), query: fileRef._id })
            .then((result, error) => {
              if (!error && result.matches && result.matches.length >= 1) {
                dbx
                  .filesDelete({
                    path: vRef.meta.pipePath
                  })
                  .then(response => {
                    if (debug && response) {
                      console.log("[onAfterRemove] File deleted from DropBox");
                    }
                  })
                  .catch(error => {
                    bound(() => {
                      if (error) {
                        throw new Meteor.Error(
                          error.status,
                          `[onAfterRemove] ${error.error.error_summary}`
                        );
                      }
                    });
                  });
              }
            })
            .catch(error => {
              bound(() => {
                if (error) {
                  throw new Meteor.Error(
                    error.status,
                    `[onAfterRemove] ${error.error.error_summary}`
                  );
                }
              });
            });
        }
      });
    });
  } catch (exception) {
    if (exception.error) {
      throw new Meteor.Error(
        exception.error,
        `[onAfterRemove] ${exception.reason}`
      );
    }

    throw new Meteor.Error("500", `[onAfterRemove] ${exception}`);
  }
};

const interceptDownload = (http, fileRef, version, self) => {
  if (debug) {
    console.log("[interceptDownload] Init");
  }

  try {
    if (
      fileRef &&
      fileRef.versions &&
      fileRef.versions[version] &&
      fileRef.versions[version].meta &&
      fileRef.versions[version].meta.pipeFrom
    ) {
      if (debug) {
        console.log("[interceptDownload] Trying to fetch file from DropBox");
      }

      const req = request({
        url: fileRef.versions[version].meta.pipeFrom,
        headers: _.pick(
          http.request.headers,
          "range",
          "cache-control",
          "connection"
        )
      });

      let len = 0;
      req
        .on("data", chunk => {
          len += chunk.length;
        })
        .on("end", () => {
          if (fileRef.size === len || fileRef.versions[version].size === len) {
            if (debug) {
              console.log("[interceptDownload] File downloaded from DropBox");
            }

            bound(() => {
              self.update(fileRef._id, { $inc: { "meta.downloads": 1 } });
            });
          } else if (debug) {
            console.log("[interceptDownload] Unknown download error");
          }
        });

      self.serve(
        http,
        {
          ...fileRef,
          name: `${fileRef.meta.name}-${fileRef._id}.${fileRef.ext}`
        },
        fileRef.versions[version],
        version,
        req
      );

      return true;
    }
    if (debug) {
      console.log("[interceptDownload] No image download available");
    }

    return false;
  } catch (exception) {
    throw new Meteor.Error("500", `[interceptDownload] ${exception}`);
  }
};

export { onBeforeUpload, onAfterUpload, onAfterRemove, interceptDownload };
