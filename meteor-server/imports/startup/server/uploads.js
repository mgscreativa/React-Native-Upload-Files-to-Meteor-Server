import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import Files from "../../api/Files/server/Files";
import multer from "multer";
import fs from "fs";

const multerInstanceConfig = { dest: "/tmp" }; // Temp dir for multer
const multerInstance = multer(multerInstanceConfig);

Picker.middleware(multerInstance.single("file"));

Picker.route("/api/v1/uploads", (params, req, res, next) => {
  console.log("Starting upload pre checks");
  const { file } = req;
  const { authToken } = req.body;

  if (file === undefined) {
    console.log("No file posted, aborting");
  } else if (authToken && !authToken.length) {
    console.log("Please, specify your authToken");
  } else {
    console.log("Checking logged in status");

    const hashedToken = Accounts._hashLoginToken(authToken);
    const user = Meteor.users.findOne({
      "services.resume.loginTokens.hashedToken": hashedToken
    });

    if (!user) {
      console.log("No user found with that token, sorry", hashedToken);
      res.end();
      return;
    }

    console.log(
      "All checks ok, proceeding upload for user",
      user.profile.name.first,
      user.profile.name.last
    );

    fs.stat(file.path, (_statError, _statData) => {
      const _addFileMeta = {
        fileName: file.originalname,
        type: file.mimetype,
        size: file.size,
        meta: {
          uploadFolder: "react-native-uploads",
          userId: user._id
        }
      };

      fs.readFile(file.path, (_readError, _readData) => {
        if (_readError) {
          console.log(_readError);
        } else {
          Files.write(
            _readData,
            _addFileMeta,
            (_uploadError, _uploadData) => {
              if (_uploadError) {
                console.log(_uploadError);
              } else {
                console.log("upload data=", _uploadData);
                fs.unlink(file.path, error => {
                  if (error) {
                    console.log(error);
                  }
                });
              }
            },
            true
          );
        }
      });
    });
  }

  res.end();
});
