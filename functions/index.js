'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { validate } = require('./components/validation');
const groups = require('./components/groups');
const users = require('./components/users');
const express = require('express');
const cors = require('cors')({origin: true});
const app = express();


app.use(cors);
app.use(validate);
app.use(groups.search);
app.use(groups.create);
app.use(groups.join);
app.use(groups.find);
app.use(groups.nextGame);
app.use(groups.rsvp);
app.use(users.registerDeviceToken);
app.use(users.updateDisplayName);
app.use(users.initializeUserWithRatings);
app.use(users.getUserInfo);
app.use(users.receivedNewDeviceToken);

// CLubhouse integration


// This HTTPS endpoint can only be accessed by your Firebase Users.
// Requests need to be authorized by providing an `Authorization` HTTP header
// with value `Bearer <Firebase ID Token>`.
exports.app = functions.https.onRequest(app);

exports.replicateRatings = functions.database.ref('/users/{userId}/ratings').onWrite((change, context) => {
  console.log('Database triggered functions');
  console.log(event);

  // Grab the current value of what was written to the Realtime Database.
  const ratings = change.after.val();
  const userId = context.params.userId;

  console.log('Creating a ratings object', context.params.userId, ratings);
  const newRatings = {
          userId: userId,
          ratedBy: userId,
          date: new Date().toUTCString(),
          sport: '5 vs 5 soccer',
          defence: ratings.defence,
          speed: ratings.speed,
          attack: ratings.attack,
          pass: ratings.pass,
          dribble: ratings.dribble,
          goalie: ratings.goalie
        };

  // return event.data.ref.parent.child('boss').set(newRatings);

  const ratingsRef = admin.database().ref('ratings/');
  const newRatingKey = ratingsRef.push().key;
  // return admin.database().ref(`/users/${userId}/ratings`).once('value').then((snapshot) => {
  //
  //   console.log(snapshot);
  //   const ratingsArray = snapshot.val();
  //   ratingsArray.push(newRatings);
  //
  //   // Write the new post's data simultaneously in the posts list and the user's post list.
  //   let updates = {};
  //   updates['/ratings/' + newRatingKey] = newRatings;
  //   updates['/users/' + userId + '/ratings'] = ratingsArray;
  //
  //   return admin.database().ref().update(updates);
  // });

  // Write the new post's data simultaneously in the posts list and the user's post list.
  let updates = {};
  updates['/ratings/' + newRatingKey] = newRatings;
  updates['/users/' + userId + '/ratings'] = newRatingKey;

  return admin.database().ref().update(updates);
  // return event.data.ref.parent.child('uppercase').set(newRatings);
  // return admin.database().ref('ratings/').push().set(newRatings);*/
});

exports.minute_job =
  functions.pubsub.topic('minute-tick').onPublish((event) => {

    /*
    console.log("This job is ran every minute!")
    const token = 'cFPkflrjqpE:APA91bGbFC87o1BUTQNm-7lsBaDa4xqyOOG_yh-5rsT-aIPg_tVhKENoNYw13sr-G0Qaw7HbNM_ryCnDTf6vOg-LkayDwrKUCdf-KLmWlyLv2J8wqwLgl8VPWa0F5FvRo4lV9IP3f-zWcvwNlAZLwt_llphEceerbA';
    var message = {
      notification: {
        title: 'Urgent action needed!',
        body: 'Urgent action is needed to prevent your account from being disabled!'
      },
      data: {
        score: '850',
        time: '2:45'
      },
      token,
    };

    admin.messaging().send(message)
      .then((response) => {
        console.log('Successfully sent message:', response);
        return true;
      })
      .catch((error) => {
        console.log('Error sending message:', error);
        return error;
      });
      */
  });
