'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { validate } = require('./components/validation');
const messages = require('./components/message');
const groups = require('./components/groups');
const users = require('./components/users');
const express = require('express');
const cors = require('cors')({origin: true});
const app = express();


app.use(cors);
app.use(validate);
app.use(messages.addMessage);
app.use(groups.search);
app.use(groups.create);
app.use(groups.join);
app.use(groups.find);
app.use(groups.nextGame);
app.use(groups.rsvp);
app.use(users.updateDisplayName);
app.use(users.initializeUserWithRatings);
app.use(users.getUserInfo);

// CLubhouse integration


// This HTTPS endpoint can only be accessed by your Firebase Users.
// Requests need to be authorized by providing an `Authorization` HTTP header
// with value `Bearer <Firebase ID Token>`.
exports.app = functions.https.onRequest(app);

exports.replicateRatings = functions.database.ref('/users/{userId}/ratings').onWrite((event) => {
  console.log('Database triggered functions');
  console.log(event);

  // Grab the current value of what was written to the Realtime Database.
  const ratings = event.data.val();
  const userId = event.params.userId;
  // const admin = event.data.adminRef;

  console.log('Creating a ratings object', event.params.userId, ratings);
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
