import { Meteor } from "meteor/meteor";
import { ValidatedMethod } from "meteor/mdg:validated-method";
import { LoggedInMixin } from "meteor/tunifight:loggedin-mixin";
import SimpleSchema from "simpl-schema";
import * as mime from "mime-types";
import Files from "./Files";

export const insertFile = new ValidatedMethod({
  name: "files.insert",
  validate: new SimpleSchema({
    name: { type: String },
    data: { type: String },
    type: { type: String },
    isBase64: { type: Boolean },
    userId: { type: String, optional: true }
  }).validator(),
  run(file) {
    try {
      const { name, data, type, isBase64, userId } = file;

      if (userId && this.userId && userId !== this.userId) {
        throw "[files.insert] Can't upload, file tampering detected";
      }

      const fileExtension = mime.extension(type);

      if (
        !RegExp(Meteor.settings.public.allowedUploadFormats, "i").test(
          fileExtension
        )
      ) {
        throw new Meteor.Error(
          "403",
          `${fileExtension} files are not allowed for upload.`
        );
      }

      const writeFile = Meteor.wrapAsync(function(buffer, options, callback) {
        Files.write(buffer, options, callback, true);
      });

      // Get result synchronously to be able to use it (for instance) in another method call IE: Update user avatar image
      const buffer = isBase64 ? Buffer.from(data, "base64") : data;
      const result = writeFile(buffer, {
        fileName: name,
        type,
        meta: {
          uploadFolder: "react-native-uploads",
          shouldResize: false,
          userId
        },
        userId
      });

      if (result && result._id) {
        console.log("[files.insert] File uploaded");
      }
    } catch (exception) {
      console.log(exception);
      throw new Meteor.Error("500", `[files.insert] ${exception.reason}`);
    }
  }
});

export const removeFile = new ValidatedMethod({
  name: "files.remove",
  mixins: [LoggedInMixin],
  checkLoggedInError: {
    error: "notLogged",
    message: "[files.remove] Public access denied",
    reason: "You need to log in first"
  },
  validate: new SimpleSchema({
    selectedIndexes: { type: Array },
    "selectedIndexes.$": {
      type: String
    }
  }).validator(),
  run(file) {
    try {
      file.selectedIndexes.map(fileId => {
        Files.remove({ _id: fileId }, error => {
          if (error) {
            console.error(
              `File ${file.imageId} wasn't removed, error: ${error.reason}`
            );
          }
        });
      });
    } catch (exception) {
      throw new Meteor.Error("500", "[files.remove] Unknown error");
    }
  }
});
