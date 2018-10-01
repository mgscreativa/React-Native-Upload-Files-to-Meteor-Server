import { Meteor } from "meteor/meteor";
import Avatars from "../Avatars";

Meteor.publish("avatar", function() {
  if (!this.userId) {
    return this.ready();
  }

  return Avatars.findOne(
    {
      "meta.userId": this.userId
    },
    {
      fields: {
        _id: 1
      }
    }
  ).cursor;
});
