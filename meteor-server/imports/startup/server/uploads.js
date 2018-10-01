import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import Avatars from "../../api/Avatars/Avatars";
import multer from "multer";
import fs from "fs";

const multerInstanceConfig = { dest: "/tmp" }; // Temp dir for multer
const multerInstance = multer(multerInstanceConfig);

Picker.middleware(multerInstance.single("file"));

Picker.route("/api/v1/uploads", (params, req, res, next) => {
  console.log("Starting upload pre checks");

  if (req.file === undefined) {
    console.log("No file posted, aborting");
  } else if (req.file.mimetype.substr(0, 6) !== "image/") {
    console.log("Sorry, can only upload images");
  } else if (params.query.authToken && !params.query.authToken.length) {
    console.log("Please, specify your authToken");
  } else {
    console.log("Checking logged in status");

    const hashedToken = Accounts._hashLoginToken(params.query.authToken);
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

    Avatars.remove({ "meta.userId": user._id });

    fs.stat(req.file.path, (_statError, _statData) => {
      const _addFileMeta = {
        fileName: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        meta: {
          userId: user._id
        }
      };

      fs.readFile(req.file.path, (_readError, _readData) => {
        if (_readError) {
          console.log(_readError);
        } else {
          Avatars.write(
            _readData,
            _addFileMeta,
            (_uploadError, _uploadData) => {
              if (_uploadError) {
                console.log(_uploadError);
              } else {
                console.log("upload data=", _uploadData);
                fs.unlink(req.file.path, error => {
                  if (error) {
                    console.log(error);
                  }
                }); // remove temp upload
              }
            }
          );
        }
      });
    });
  }

  res.end();
});
