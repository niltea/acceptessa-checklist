const aws = require('aws-sdk');
const dynamodb = new aws.DynamoDB.DocumentClient({ convertEmptyValues: true });

class ListFavoriteCommand {
  constructor(args,user){
    if (!args.exhibition_id)  { throw new Error("not exhibition_id") }
    if (!user.screen_name)    { throw new Error("not screen_name") }
    this.exhibition_id = args.exhibition_id;
    this.member_id     = user.screen_name;
  }

  run() {
    return dynamodb.query({
      TableName: 'tessa_favorite',
      IndexName: 'tessa_favorite_gsi',
      KeyConditionExpression: 'member_id = :member_id and exhibition_id = :exhibition_id',
      ExpressionAttributeValues: { ':member_id': this.member_id, ':exhibition_id': this.exhibition_id },
      //ProjectionExpression: 'circle_id, member_id',
    }).promise()
      .then(data => data.Items)
      .then(data => {
        return Promise.all([
          Promise.resolve(data),
          dynamodb.get({
            TableName : 'tessa_config',
            Key: { member_id: this.member_id, exhibition_id: this.exhibition_id },
          }).promise(),
        ])
        .then(data => {
          return {
            favorite: data[0],
            config: {
              public: (data[1].Item && data[1].Item.public ) ? true : false,
            }
　        };
        });
      });
  }
}

module.exports = ListFavoriteCommand;