import { Meteor } from "meteor/meteor";
import Files from "./Files";

Meteor.publish("files.all", function() {
  return Files.find().cursor;
});
