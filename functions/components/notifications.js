const gcm = require('node-gcm');
 
// Set up the sender with your GCM/FCM API key (declare this once for multiple messages)
const sender = new gcm.Sender('AIzaSyBunKYhmqjimVYpDDwGvBEUc-MFhnAB7O4');

exports.sendPushNotification = (msg, regTokens) => {
    // Prepare a message to be sent
    const message = new gcm.Message({
        data: {
            key: `${msg}`
        }
    });
    Promise.all(regTokens).then((tokens) => {
        console.log(tokens);
        return tokens;
    })
    .then((tokens) => {
        return sender.send(message, { registrationTokens: tokens })
    })
    .then((response) => {
        return response;
    })
    .catch((error) => {
        return error;
    })
};