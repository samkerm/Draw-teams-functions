'use strict';
const admin = require('firebase-admin');
const express = require('express');
const _ = require('lodash');
const notification = require('./notifications');
const app = express();

const groups = module.exports;

groups.search = app.get('/groups/search', (req, res) => {
  console.log('Reached groups/search');

  if (req.query && req.query.string) {
    const string = req.query.string;

    return admin.database().ref('groups/').orderByChild('name')
             .startAt(string)
             .endAt(string + '\uf8ff')
             .on('value', (dataSnapshot) =>
     {
       const data = dataSnapshot.val();
       let groups = [];
       for (const key in data) {
         const group = data[key];
         group.id = key;
         delete group.members;
         groups.push(group);
       }
       return res.send(groups);
     });
  }
  return res.status(403).send('Group search content is missing');
});

groups.create = app.post('/groups/create', (req, res) => {
  console.log('Reached groups/create');

  if (req.body && req.user) {
    const groupData = JSON.parse(req.body);
    const userId = req.user.uid;
    console.log(req.user);

    const groupsRef = admin.database().ref('groups/');
    const newGroupKey = groupsRef.push().key;

    // Write the new post's data simultaneously in the posts list and the user's post list.
    let updates = {};
    updates['/groups/' + newGroupKey] = groupData;
    updates['/users/' + userId + '/groupId'] = newGroupKey;
    // updates['/groups' + newGroupKey + '/members'] = {regular: app.state.userId};

    return admin.database().ref().update(updates)
    .then(() => {
      console.log('Updated');
      return res.send(true);
    })
    .catch((error) => {
      console.log('Couldnt update');
      return res.status(403).send(error);
    });
  }
  return res.status(400).send('Group creation content is missing');
});

groups.join = app.post('/groups/:groupId/join', (req, res) => {
  console.log('Reached groups/join');
  if (req.params && req.params.groupId && req.user && req.user.uid)
  {
    console.log(req.params.groupId, req.user.uid)
    const userId = req.user.uid;
    const groupId = req.params.groupId;
    const groupsRef = admin.database().ref('groups/' + groupId + '/regulars');
    return groupsRef.once('value').then((snapshot) =>
    {
      const regulars = snapshot.val();
      console.log(regulars)
      if (regulars && regulars.find(el => el === userId))
      {
        throw new Error('User is already a regular member of this group');
      }
      else
      {
        regulars.push(userId);
      }

      let updates = {};
      updates['groups/' + groupId + '/regulars'] = regulars;
      updates['/users/' + userId + '/groupId'] = groupId;
      return admin.database().ref().update(updates);
    })
    .catch((error) =>
      {
      console.error(error.message)
      return res.status(403).send(error.message);
    });
  }
  console.log('Group join content is missing');
  return res.status(400).send('Group join content is missing');
});

groups.find = app.get('/groups/:id', (req, res) => {
  console.log('Reached /groups');

  if (req.params && req.params.id)
  {
    const groupId = req.params.id;

    return admin.database()
                .ref('/groups/' + groupId)
                .once('value')
                .then((dataSnapshot) =>
     {
       const data = dataSnapshot.val();
       console.log(data);
       return res.send(data);
     }).catch((error) => {
       console.log(error);
       return res.status(403).send(error.message);
     });
  }
  return res.status(400).send('Group groupId is missing');
});

groups.nextGame = app.post('/groups/:groupId/nextgame', (req, res) => {
  console.log('Reached groups/:groupId/nextgame');

  console.log(req.body, req.params, req.params.groupId);
  if (req.body && req.params && req.params.groupId)
  {
    const groupId = req.params.groupId;
    const nextGame = JSON.parse(req.body);
    console.log(groupId, nextGame);

    // TODO: Validate next game data is valid before putting it in
    // The game date needs to be converted to UTC time
    return admin.database().ref('groups/' + groupId + '/nextGame')
    .set(nextGame)
    .then(res.status(200).send(true))
    .catch((error) => {
      console.error('Setting next game failed: ', error.message);
      return res.status(403).send(new Error('Initialization failed'));
    });
  }
  return res.status(400).send('Next game creation content is missing');
});

function evaluateUsersByRatings(users) {
  /* Each user will get a total score based on their ratings
  - Defence     2 points
  - Attack      1 point
  - Speed       3 points
  - Pass        1 point
  - Dribble     2 points
  - Goalkeeping 1 point
  ----------------------
  Total         100 points
  
  New feature:
  - Endurance   2 points
  */

  const defenceWeight   = 2;
  const attackWeight    = 1;
  const speedWeight     = 3;
  const passWeight      = 2;
  const dribbleWeight   = 2;
  const goalieWeight    = 1;

  users.map((user) => {
    let total = 0;
    total += Number(user.ratings.defence || 0) * defenceWeight;
    total += Number(user.ratings.attack || 0) * attackWeight;
    total += Number(user.ratings.speed || 0) * speedWeight;
    total += Number(user.ratings.pass || 0) * passWeight;
    total += Number(user.ratings.dribble || 0) * dribbleWeight;
    total += Number(user.ratings.goalie || 0) * goalieWeight;
    user['total'] = total;
    return user;
  })

  // sort by total score highest first
  users = users.sort((a, b) => {
    return b.total - a.total;
  });

  return users;
}

function getUserRatingsSorted(userIds) {
  return Promise.all(userIds.map(id => {
    return admin.database().ref().child('users').child(id).once('value').then((s) => {
      const user = s.val();
      user.id = id;
      return user;
    });
  }));
}

function distributePlayersInTeams(users)
{
  const teamA = [];
  const teamB = [];
  const isOddNumberedTeams = (users.length / 2) % 2 === 0;
  const lastUser = users.length - 1;

  // Add best and worst
  for (let i = 0; i < users.length/2 ; i++) {
    const best = i;
    const worst = lastUser - i;
    // All even numbers in team A
    if (i % 2 === 0)
    {
      if (isOddNumberedTeams && worst - best === 1)
      {
        teamATotal = teamA.reduce(((a, b) => a + b), 0);
        teamBTotal = teamB.reduce(((a, b) => a + b), 0);
        if (teamATotal > teamBTotal)
        {
          teamB.push(users[best].id);
          teamA.push(users[worst].id);
        }
        else
        {
          teamA.push(users[best].id);
          teamB.push(users[worst].id);
        }
      }
      else 
      {
        teamA.push(users[best].id);
        teamA.push(users[worst].id);
      }
    } 
    // All odd numbers in team B
    else 
    {
      teamB.push(users[best].id);
      teamB.push(users[worst].id);
    }
  }

  // All users have the same groupId, so its easily fetched.
  const groupId = users[0].groupId;
  return admin.database().ref('groups/' + groupId + '/nextGame').update({
    teamA,
    teamB
  });
}

function prepareGameForStart(userIds) {
  getUserRatingsSorted(userIds)
  .then((users) => evaluateUsersByRatings(users))
  .then((playerAndRatings) => distributePlayersInTeams(playerAndRatings))
  .then(() => notification.sendPushNotificationTo('Teams have been selected', 'Log in to your group to see your team', userIds))
  .catch((error) => {
    console.error(error);
  });
}

groups.rsvp = app.post('/groups/:groupId/rsvp', (req, res) => {

  console.log('Reached /groups/:groupId/rsvp');

  if (req.body &&
      req.user && req.user.uid && 
      req.params && req.params.groupId) {

    const groupId = req.params.groupId;
    const userId = req.user.uid;
    const { rsvp: status } = JSON.parse(req.body);
    console.log(groupId, userId, status);

    let rsvpYes;
    let rsvpNo;
    let nextGame;

    return admin.database()
      .ref('groups/' + groupId + '/nextGame')
      .once('value')
      .then((dataSnapshot) => {
        nextGame = dataSnapshot.val();
        rsvpYes = nextGame.rsvpYes || [];
        rsvpNo = nextGame.rsvpNo || [];
        _.remove(rsvpNo, (id) => id === userId);
        _.remove(rsvpYes, (id) => id === userId);

        switch (status) {
          case 'YES':
            rsvpYes.push(userId)
            break;
          case 'NO':
            rsvpNo.push(userId)
            break;
          default:
            break;
        }

        if (rsvpYes.length === nextGame.numberOfPlayers)
        {
          prepareGameForStart(rsvpYes);
        }
        else
        {
          delete nextGame.teamA;
          delete nextGame.teamB;
        }

        nextGame['rsvpYes'] = rsvpYes;
        nextGame['rsvpNo'] = rsvpNo;
        return admin.database().ref('groups/' + groupId + '/nextGame').set(nextGame);
      })
      .then(res.status(200).send({status}))
      .catch((error) => {
        console.log(error);
        return res.status(403).send(error.message);
      });
    }
  return res.status(400).send('Next game creation content is missing');
});

groups.rsvp = app.post('/groups/:groupId/memberStatus', (req, res) => {
  console.log('Reached /groups/:groupId/memberStatus');

  if (req.user && req.user.uid && 
      req.params && req.params.groupId &&
      req.query && req.query.status) {

    const groupId = req.params.groupId;
    const userId = req.user.uid; // Make sure user requesting belongs to the group
    const status = req.query.status;

    console.log(groupId, userId, status);
    let group;
    // Find the group from the id
    return admin.database()
      .ref('groups/' + groupId)
      .once('value')
      .then((dataSnapshot) => {
        group = dataSnapshot.val();
        
        // Combine all members to figure out if requester belongs to the group
        let allMembers = [];
        if (group && group.regulars) {
          allMembers = allMembers.concat(group.regulars)
        }
        if (group && group.reserves) {
          allMembers = allMembers.concat(group.reserves)
        }
        if (!allMembers.some(id => id === userId)) {
          return res.status(403).send(new Error('The requester is not a member of this group. Can not change status of this member.'))
        }
        
        // Remove the member status and append it to the right one
        const regulars = group.regulars || [];
        const reserves = group.reserves || [];
        _.remove(regulars, (id) => id === userId);
        _.remove(reserves, (id) => id === userId);

        switch (status) {
          case 'regular':
            regulars.push(userId)
            break;
          case 'reserve':
            reserves.push(userId)
            break;
          default:
            break;
        }

        let updates = {};
        updates['groups/' + groupId + '/regulars'] = regulars;
        updates['groups/' + groupId + '/reserves'] = reserves;

        group.regulars = regulars;
        group.reserves = reserves;

        return admin.database().ref().update(updates);
      })
      .then(() => {
        return res.status(200).send({group});
      })
      .catch((error) => {
        console.log(error);
        return res.status(403).send(error.message);
      });
  }
  return res.status(400).send('Next game creation content is missing');
});