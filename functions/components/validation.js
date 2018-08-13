'use strict';

// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: 'draw-teams',
    clientEmail: 'draw-teams@appspot.gserviceaccount.com',
    privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCzVcbjoMqDTtWz\n5+0GZxSlHZ7W9oL7CRAPkAt0Roq4BGrkNMsbGg7bGCxXPBVZH7L2MPxZaYdZQPKM\nUW/v8wE6JGj2J8JvdMs9N9+oLbhy5s6by4efAWKG+qUo1zmULTwqGij6OiIYaY/h\nToM17J/f7UE3meTTwRqCfnRUYl1z+n4yqOVePvErAfpq96zDH6tkgtNktmIQ2Cl/\n9JpRRXfvrUnXwUe5tEsJHraESH5W1hgLiYcqk2r8iRHZLDyabgRsvPazFHP1lynA\nnSqAO2lp6lHzfE9RA8PFr0RluK9IucAY6s42cigfuZ5zkk4XVfqJQ4ueF5WyLAO8\nPPcEGvrTAgMBAAECggEAPx/f2MsFza+HuIJYI8tP8IjbGuZ9l1iKzzeQWJbmCD0B\n1R8iKQGEnilFnlU3XH40c8UtZlmne0rJtYuK38bFNU6Qpai8H5hYW82Zi+zAAq3s\nptk+/UCzCjkavqP3kAlWJqm7p8yjqL0rmI6Wz/nhEqTEMoqYidLsfmd9kiBnrcUz\nisj+sp928fOWb7K0PcIRKTwzlC92RECZdfg6RjmUsSW3dqXnVXdiW2s8nO88cddX\nnk+V0qtaGe75gD46e3bR1FmYbeP7x0Zb3K/xWdrbLTYjV9Qmf+xPwr/Ea3geJp+p\nz4vI5Dhug2L2mtgqK1mdqKfd3M37+N7cRq8HEhrWcQKBgQD30WGvd4c81Sh1sqQb\nNX8Wu5MD4raEwJ5/71f6ByUoHnxWVUH8h5Rq3bvErh3rN9rMSFFp2UzktV16R5va\nvTzVEa0bJ/8CxBNhK6njk7JnSKgjWs3vHWWUnoSW1p2J36gc7UtR/nXOm64mV2SO\nHOP+I1WBEOj8aBuq+bDLX7OR8QKBgQC5QY+6AjzADhw7Sn/nPfpZLLElTY2DFW7L\nVV3I1C3lWhQV73KBEzXYSuKol4o2me0lsPkL7jwlPUPYm6NLluXf9/w+04GZ1xvB\nUAKNWxLtHy90Xx/o04WvRvRxc/S0FjkzRe2jpcvbaDq+f1NGi4YT4JEW3iDHi3lD\n6yexIv+VAwKBgQCPmazZWJHtFjeTvCiL+7vhGGBgaAcLdfJif/ai03Echk3WWSEb\njBTcuBAOMDb2Di+jIGTMyTZdcRrxuHz/i5isfsmoaszCdYwlSn/vd65xWxDTK9MZ\nNBegvxplrYcsVYW8/WQf5yusxVlsrkd+cg9LPH5Xg8z+NfWSZY2ky5fqgQKBgEA3\nx9jU+bYhrgunkZrZUzUiVu31aj6saVG27+G0G4zLovbPoEO6IwotO1Dx5wlyZlCQ\nfmRyWwsVp7UojnyffGQdFKW6r8xiUs66K4hQr8je7JZMe0U8PbU6xXWmmobqxT1O\n2kfGK1qNUP/EJ1vm9b1iNSlWKsrBQHIYzBONbEd9AoGBANo/o9u6KhJNU5aSIJAO\nJB3LhuJXdDxKlBIunHbRZBjtNBxpkcPXje0ruqEUn17jKiH3X3RHnZrTP7t6QmU3\nVERQnKgLxBWf3iYe8R/FubWjTzfJ1spN0DBbagQr6QzDnMHrdsURFv5SO4PNwnEX\nEXFAopIXFJ14ypm6cHG/xivI\n-----END PRIVATE KEY-----\n',
  }),
  databaseURL: 'https://draw-teams.firebaseio.com'
});

const validateFirebaseIdToken = module.exports;

validateFirebaseIdToken.validate = (req, res, next) => {
  console.log('Check if request is authorized with Firebase ID token');

  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    console.error('No Firebase ID token was passed as a Bearer token in the Authorization header.',
        'Make sure you authorize your request by providing the following HTTP header:',
        'Authorization: Bearer <Firebase ID Token>',
        'or by passing a "__session" cookie.');
    console.log(req.headers.authorization);
    // console.log();
    res.status(403).send('Unauthorized succka');
    return;
  }

  let idToken;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    console.log('Found "Authorization" header');
    // Read the ID Token from the Authorization header.
    idToken = req.headers.authorization.split('Bearer ')[1];
  }
  admin.auth().verifyIdToken(idToken).then((decodedIdToken) => {
    console.log('ID Token correctly decoded', decodedIdToken);
    req.user = decodedIdToken;
    return next();
  }).catch((error) => {
    console.error('Error while verifying Firebase ID token:', error);
    res.status(403).send('Unauthorized succka');
  });
};
