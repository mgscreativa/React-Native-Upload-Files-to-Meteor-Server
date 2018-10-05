
# React Native Upload Files to Meteor Server
Sample app to demostrate upload files from React Native app to Meteor Server, with DropBox integration. This demo uses expo, to install it just run ```npm install expo-cli --global```, it's a free and open source toolchain built around React Native to help you build native iOS and Android projects using JavaScript and React, see details [here](https://expo.io/).

## Run Meteor Server
- Download/checkout this repo
- cd meteor-server
- Edit **settings-development.json**, complete **DROPBOX_TOKEN** property. Instructions here [Prepare: Get access to DropBox API:](https://github.com/VeliovGroup/Meteor-Files/wiki/DropBox-Integration). Take a look at **allowedUploadFormats** to check allowed upload files, by default **png|jpg|jpeg|gif|mp4|mov|qt|pdf|ods**
- Run ~/meteor --settings settings-development.json --port 3000
- Visit **http://localhost:3000** and login with ```admin@admin.com``` and ```password```
- Click on **Files** menu to see current uploaded files

## Run React Native App
- Download Expo app to your mobile device [iOS](https://itunes.apple.com/us/app/expo-client/id982107779?mt=8) - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent&hl=es)
- cd react-native-app
- Run ~/expo start
- Run app from expo then select media from camera roll, take a picture or pick a file (pdf or ods, or image)
- Upload the file through:
  - Meteor Method (Uses DDP and base64, very unefficient. Currently supports only image files. Can't upload large files, like videos. Document files [ods, pdf] get corrupted, I think because of base64).
  - POST request (Upload anything allowed and it works!)
  - Apisause POST (the same as above but using the Apisause npm library)
## Based on
- [Meteor Server Part: Meteor-Files-POST-Example](https://github.com/noris666/Meteor-Files-POST-Example) and [Meteor-Files Http upload Example](https://gist.github.com/ankibalyan/bbd69e1b08645d61bc9f535afcd8a3a1)
- [React Native Client Part: React-Native-Tips](https://github.com/g6ling/React-Native-Tips/blob/master/How_to_upload_photo%2Cfile_in%20react-native/README.md)

