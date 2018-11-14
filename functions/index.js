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

/**
 * Every time a group information is changed, send a silent notification 'groupUdpated: true'
 * to all members of that group. If the app is oppened and on home screen the screen should reload group data.
 */
exports.notifyGroupUsers = functions.database.ref('/groups/{groupId}').onUpdate((snapshot, context) => {
  console.log('Group change triggered functions');
  console.log(snapshot);

  // Grab the current value of what was written to the Realtime Database.
  const group = snapshot && snapshot.after && snapshot.after.val();
  const groupId = context && context.params && context.params.groupId;

  console.log(group, groupId);
  
  // Combine all members to update their view
  let notifyingIds = [];
  if (group && group.regulars) {
    notifyingIds = notifyingIds.concat(group.regulars)
  }
  if (group && group.reserves) {
    notifyingIds = notifyingIds.concat(group.reserves)
  }
  notifications.sendSilentPushNotificationTo({groupUpdated: "1"}, notifyingIds);
});

function handleRegularsNotification(groups)
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
    notifications.sendPushNotificationTo('RSVP pending', 'Please confirm your attendance for next game to keep your spot', {}, notifyingIds);
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
    notifications.sendPushNotificationTo('RSVP opened', `RSVP is opened to reserves of ${group.name || 'Your Group'}`, {}, group.reserves);
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
  
  goupsWithGamesEnded.forEach((group) => {
    // For now just instantly update things
    const title = 'Rate Your Teammate';
    const description = 'Game has ended. Please provide ratings for your teammates.';

    if (group.nextGame && group.nextGame.teamA && group.nextGame.teamB) {
      notifications.sendPushNotificationTo(title, description, {
        team: group.nextGame.teamA.toString() // Data payload must be in string
      }, group.nextGame.teamA);
      notifications.sendPushNotificationTo(title, description, {
        team: group.nextGame.teamB.toString() // Data payload must be in string
      }, group.nextGame.teamB);
    }

    let gameDate;
    let regularsNotification;
    let reservesNotification;

    if (group.nextGame.weeklyRepeat)
    {
      // Add 1 week to dates.
      gameDate = moment(group.nextGame.gameDate, 'dddd, YYYY-MMM-DD kk:mm').add(7, 'days').format('dddd, YYYY-MMM-DD kk:mm');
      regularsNotification = moment(group.nextGame.regularsNotification, 'dddd, YYYY-MMM-DD kk:mm').add(7, 'days').format('dddd, YYYY-MMM-DD kk:mm');
      if (!_.isEmpty(group.nextGame.reservesNotification))
      {
        reservesNotification = moment(group.nextGame.reservesNotification, 'dddd, YYYY-MMM-DD kk:mm').add(7, 'days').format('dddd, YYYY-MMM-DD kk:mm');
      }
    }
    else if (group.nextGame.monthlyRepeat)
    {
      // Add 1 month to dates.
      gameDate = moment(group.nextGame.gameDate, 'dddd, YYYY-MMM-DD kk:mm').add(1, 'months').format('dddd, YYYY-MMM-DD kk:mm');
      regularsNotification = moment(group.nextGame.regularsNotification, 'dddd, YYYY-MMM-DD kk:mm').add(1, 'months').format('dddd, YYYY-MMM-DD kk:mm');
      if (!_.isEmpty(group.nextGame.reservesNotification)) {
        reservesNotification = moment(group.nextGame.reservesNotification, 'dddd, YYYY-MMM-DD kk:mm').add(1, 'months').format('dddd, YYYY-MMM-DD kk:mm');
      }
    }

    const nextGame = {
      gameDate,
      regularsNotification,
      reservesNotification,
      weeklyRepeat: group.nextGame.weeklyRepeat,
      monthlyRepeat: group.nextGame.monthlyRepeat,
      numberOfPlayers: group.nextGame.numberOfPlayers
    };

    admin.database().ref('groups/' + group.id + '/nextGame')
      .set(nextGame)
      .then(console.log('Successfully created a new next game'))
      .catch((error) => {
        console.error('Setting next game failed: ', error.message);
      });
    // One hour later
    setTimeout(() => {
      // Get the teamA and teamB
      // Send notifications to people with user ids to rate
      // look for repeating status
      // set next game if should repeat
      // remove game if not repeating.
    }, 3600000);
  });
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
          const groups = _.values(snapshot.val()); // Creates an array of values
          const groupIds = _.keys(snapshot.val()); // Creates an array of keys
          groups.forEach((group, index) => group.id = groupIds[index]); // Add keys as an id parameter
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