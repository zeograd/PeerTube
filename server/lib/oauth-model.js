const mongoose = require('mongoose')

const logger = require('../helpers/logger')

const OAuthClient = mongoose.model('OAuthClient')
const OAuthToken = mongoose.model('OAuthToken')
const User = mongoose.model('User')

// See https://github.com/oauthjs/node-oauth2-server/wiki/Model-specification for the model specifications
const OAuthModel = {
  getAccessToken: getAccessToken,
  getClient: getClient,
  getRefreshToken: getRefreshToken,
  getUser: getUser,
  revokeToken: revokeToken,
  saveToken: saveToken
}

// ---------------------------------------------------------------------------

function getAccessToken (bearerToken) {
  logger.debug('Getting access token (bearerToken: ' + bearerToken + ').')

  return OAuthToken.getByTokenAndPopulateUser(bearerToken)
}

function getClient (clientId, clientSecret) {
  logger.debug('Getting Client (clientId: ' + clientId + ', clientSecret: ' + clientSecret + ').')

  // TODO req validator
  const mongoId = new mongoose.mongo.ObjectID(clientId)
  return OAuthClient.getByIdAndSecret(mongoId, clientSecret)
}

function getRefreshToken (refreshToken, callback) {
  logger.debug('Getting RefreshToken (refreshToken: ' + refreshToken + ').')

  return OAuthToken.getByRefreshTokenAndPopulateClient(refreshToken)
}

function getUser (username, password) {
  logger.debug('Getting User (username: ' + username + ', password: ' + password + ').')

  return User.getByUsernameAndPassword(username, password)
}

function revokeToken (token) {
  return OAuthToken.getByRefreshToken(token.refreshToken).then(function (tokenDB) {
    if (tokenDB) tokenDB.remove()

    /*
      * Thanks to https://github.com/manjeshpv/node-oauth2-server-implementation/blob/master/components/oauth/mongo-models.js
      * "As per the discussion we need set older date
      * revokeToken will expected return a boolean in future version
      * https://github.com/oauthjs/node-oauth2-server/pull/274
      * https://github.com/oauthjs/node-oauth2-server/issues/290"
    */
    const expiredToken = tokenDB
    expiredToken.refreshTokenExpiresAt = new Date('2015-05-28T06:59:53.000Z')
    return expiredToken
  })
}

function saveToken (token, client, user) {
  logger.debug('Saving token for client ' + client.id + ' and user ' + user.id + '.')

  const tokenObj = new OAuthToken({
    accessToken: token.accessToken,
    accessTokenExpiresAt: token.accessTokenExpiresAt,
    client: client.id,
    refreshToken: token.refreshToken,
    refreshTokenExpiresAt: token.refreshTokenExpiresAt,
    user: user.id
  })

  return tokenObj.save(function (err, tokenCreated) {
    if (err) throw err // node-oauth2-server library uses Promise.try

    tokenCreated.client = client
    tokenCreated.user = user

    return tokenCreated
  })
}

// ---------------------------------------------------------------------------

module.exports = OAuthModel