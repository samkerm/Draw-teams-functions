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
    // Actually send the message
    sender.send(message, {
            registrationTokens: regTokens
        })
        .then((response) => {
            return response;
        })
        .catch((error) => {
            return error;
        });
};