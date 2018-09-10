'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { validate } = require('./components/validation');
const groups = require('./components/groups');
const users = require('./components/users');
const express = require('express');
const cors = require('cors')({origin: true});
const app = express();
const moment = require('moment-timezone');
const _ = require('lodash');
const notifications = require('./components/notifications');

app.use(cors);
app.use(validate);
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

function handleRegularsNotification(group)
{
  const goupsWithGames = groups.filter((group) => {
    // 'dddd, YYYY-MMM-DD kk:mm' formatting comes from the app. It needs to be a match
    return (group.nextGame &&
      group.nextGame.regularsNotification &&
      group.nextGame.regularsNotification === moment().tz('America/Los_Angeles').format('dddd, YYYY-MMM-DD kk:mm'));
  });

  goupsWithGames.forEach((group) => {
    // Find out if any of the regulars have already RSVPed
    const notifyingIds = group.regulars.filter((id) => {
      const rsvpYes = group.nextGame.rsvpYes || [];
      const rsvpNo = group.nextGame.rsvpNo || [];
      const totalRSVP = rsvpYes.concat(rsvpNo);
      if (!_.isEmpty(totalRSVP)) {
        return !totalRSVP.some(id);
      }
      return true;
    });
    notifications.sendPushNotificationTo('RSVP pending', 'Please confirm your attendance for next game to keep your spot', notifyingIds);
  })
}

function handleReservesNotification(groups) {
  const goupsWithGames = groups.filter((group) => {
    // 'dddd, YYYY-MMM-DD kk:mm' formatting comes from the app. It needs to be a match
    return (group.nextGame &&
      group.nextGame.reservesNotification &&
      group.nextGame.reservesNotification === moment().tz('America/Los_Angeles').format('dddd, YYYY-MMM-DD kk:mm'));
  });

  goupsWithGames.forEach((group) => {
    notifications.sendPushNotificationTo(`RSVP opened', 'RSVP is opened to reserves of ${group.name || 'Your Group'}`, group.reserves);
  })
}

function processEndGame(groups)
{
  const goupsWithGamesEnded = groups.filter((group) => {
    // 'dddd, YYYY-MMM-DD kk:mm' formatting comes from the app. It needs to be a match
    return (group.nextGame &&
      group.nextGame.gameDate &&
      group.nextGame.gameDate === moment().tz('America/Los_Angeles').format('dddd, YYYY-MMM-DD kk:mm'));
  });
  // .
  // .
  // .
  // .
  // .
  // Process resettings.
}

exports.minute_job =
  functions.pubsub.topic('minute-tick').onPublish((event) => {

    console.log('\n\n\n\n\n\nminute_job:\n', moment().tz('America/Los_Angeles').format('dddd, YYYY-MMM-DD kk:mm:ss'), '\n');

    // TODO: Find a way to improve the query to include only groups that have nextGame 
    // and notification time matches
    admin.database().ref('groups').once('value')
    .then((snapshot) =>
      {
        if (snapshot && snapshot.val())
        {
          const groups = _.values(snapshot.val());
          handleRegularsNotification(groups);
          handleReservesNotification(groups);
          processEndGame(groups)
        }
        return true;
    })
    .catch(error)
    {
      return error;
    }
  });