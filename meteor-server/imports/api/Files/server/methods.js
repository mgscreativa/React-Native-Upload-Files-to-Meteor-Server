import { Meteor } from "meteor/meteor";
import { ValidatedMethod } from "meteor/mdg:validated-method";
import { LoggedInMixin } from "meteor/tunifight:loggedin-mixin";
import SimpleSchema from "simpl-schema";
import * as mime from "mime-types";
import Files from "./Files";

export const insertFile = new ValidatedMethod({
  name: "files.insert",
  validate: new SimpleSchema({
    fileName: { type: String },
    base64DataURI: { type: String, optional: true },
    buffer: { type: Object, optional: true },
    userId: { type: String, optional: true }
  }).validator(),
  run(file) {
    try {
      const { fileName, base64DataURI, userId } = file;

      if (userId && this.userId && userId !== this.userId) {
        throw "[files.insert] Can't upload, file tampering detected";
      }

      const fileMime = base64DataURI.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)[0];
      const fileExtension = mime.extension(fileMime);

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
      const result = writeFile(
        Buffer.from(
          base64DataURI.replace(/^data:image\/\w+;base64,/, ""),
          "base64"
        ),
        {
          fileName: fileName,
          type: fileMime,
          meta: {
            uploadFolder: "react-native-uploads",
            shouldResize: false,
            userId
          },
          userId
        }
      );

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
