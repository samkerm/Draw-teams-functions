'use strict';
const admin = require('firebase-admin');
const express = require('express');
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
    const groupData = req.body;
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
    const userId = req.user.uid;
    const groupId = req.params.groupId;
    const groupsRef = admin.database().ref('groups/' + groupId + '/regulars');
    return groupsRef.once('value').then((snapshot) =>
    {
      const regulars = snapshot.val();
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
    }).catch((error) =>
      {
      console.error(error.message)
      return res.status(403).send(error.message);
    }).then(res.status(200).send(true));
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
    const nextGame = req.body;
    console.log(groupId, nextGame);

    return admin.database().ref('groups/' + groupId + '/nextGame').set(nextGame)
      .catch((error) => {
        console.error('Setting next game failed: ', error.message);
        return res.status(403).send(new Error('Initialization failed'));
      })
      .then(res.status(200).send(true));
      
  }
  return res.status(400).send('Next game creation content is missing');
});
