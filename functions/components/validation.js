'use strict';

// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: 'draw-teams',
    clientEmail: 'firebase-adminsdk-hh541@draw-teams.iam.gserviceaccount.com',
    privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCobuQqu6Sv9VLG\njiSF3WzJ+tmk//K1V6WwXA0DfhsyVNfCu+sqVnZgdqpOC+PHs4nY/ch0ZjQtBzlT\nd+xyw2SN2+2neblz8EFU4EEo12fCZ5Mqnzwxn5r0pF3FO/hjVXOL8GF0JoKXIFZ0\nfl4+1FsBQ3scj+jXW8zm2puitUNce5Fu+uC5vicebWaV7vxVQKR9BMc928911+DL\ng99MnPh0abFwmOvKy/OX970LO4z2MqRt3NFSyZiW2nHWPQCxTfw7hcG9o4TRvURj\nMQWrBg4hl3tu28FSK/O4244otIFNFnwLSQ/ECUC/IVy8CxsokZBcQEUHTNmp/R68\nZI26yHHnAgMBAAECggEAHZfCIdnvEPVG0ljmBNkHBKO8upc3kvHvzAEYTj1JVPoA\nIJg4tKsVSFSBDo5bOlqKhSPtpLnSP/kNcuNWmUFIOP5jjnG+Ciczq1BtUloqQkdF\nXY81mbhjlskMKpujQ/ye/P7CeJBNkHTfi78qGtrflGTBTB7it3fLE+Jjxt4XFDfe\ntxe3X71+3Isua2j8ay0V0gQDlIkqHjkUivJ6UBxVIpcv+7la62e/ByV/YPJHc4wj\nLjRK+nj8S0Rp2fMZ6idt2h+HGKdbqXYk1k4n9JSDUZSYHWUUhgvhwRIEd2Z9sMGL\n4NlDx1reqyrg2KpEcSqoUlgOzaID2+E59tyfem42xQKBgQDS6KpJhJ3+V5CE40QW\nqVOhNugKSuYUQrpBG/Xp+h9oqDcC3mlh/seq1ZPKp2ln9Rr6SEzn3cM3/s16HeOJ\n3+ftpPXizGT6S01gDtHK1cCB8ciFtPDeBkLAME5iqxKuzDr0OwDZebXZte6Pmjyf\nC3ko8PQWhohKJ3q0ZLUZKdnuxQKBgQDMcXkZgQgLpqKnlyJhVpARiLQKoSYSuMOW\nA4y6za3sfPEdmpIxe3l/SaphQVWQq67anioueRr+CpFAGiccGjFD1alVbaB98gPV\nbHBupw+5Yk/wd+o+tDrBeuIhwS0qIOrmy2vIIpTPm3TEDInQ+lUCzezVNjEZ+m50\nKt+GuqtouwKBgQDQbx/biDScJ+2rZu7jdnQv3xNzGJJJc6iesANYONjRlWzIaQW8\n0w6AxpJItSp2ksUWlF1syL0lmat4BBHbMG0FbwGSIm2o7sKJLBwpWRXnVgvWF/vz\ncDyHszXETU0pcqzQsX8lbiNKBYK+aK+AftY+n+KaYFpQ7rNVlDFlrPa0AQKBgGDz\ngvFETnNv/3yoYGZ2rXWTNYZA65Q/SIlQf6FqvosCqTlXvvJ2UqS5Y3IhkJk9wXrt\nPKWzSsikbENQ47Eg/rHjlhzsEwsHBShl91+SHBPW+n/X7h70S1TLmIdXW7q5x4vR\ndfh/5cAaQaJjK8wNmtjsnN5zh4+BQnYWitASoAzXAoGAL3dLp0Hms5vhiGVArinK\nI82fJMrF6FVjDES58qDHRtjzAWBrAbk5luxMINTiyJ//HarAyRxHSrkLQYjRHoae\nATr6OOwj3ZTITPpm0fJmhaOEM0nlWqnKm+/xBFIFHMpDdqaQOsde/6VG4pOIpIdP\nYmrec9uFxf0/3s6z2FwrQeg=\n-----END PRIVATE KEY-----\n'
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
