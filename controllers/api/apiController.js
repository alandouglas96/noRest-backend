/*
# Note

## The apiName is sent to lowercase because in the modelGenerators 
## the files is saved all in lowercase, even if the name of the api
## is not in lowercase.
*/

const csvtojson = require('csvtojson');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink); 
const ApiModel = require('../../models/logistics/logisticsModel');


// --- get all entries for an API:

exports.getAll = async ctx => {
  const apiName = ctx.params.api_name;
  const model = require(`../../models/api/${apiName}Model.js`);

  try {
    const results = await model.find({});
    ctx.body = results;
    ctx.status = 200;
  } catch (error) {
    console.error(`Error in getting all values from DB for: ${apiName} API`, error);
    ctx.body = { error: `Error in getting all values from DB for: ${apiName} API` };
    ctx.status = 500;
  }
};


// --- get whole API that has a certain field and value:

exports.getByFieldAndValue = async ctx => {
  const apiName = ctx.params.api_name;
  const field = ctx.params.field;
  const value = ctx.params.value;
  const model = require(`../../models/api/${apiName}Model.js`);

  // get query
  let { match } = ctx.query;

  if (match) {
    let resolvedQuery;
    if (match === 'startswith') {
      resolvedQuery = await model.find().where(field).regex(`^${value}`);
    } else if (match === 'endswith') {
      resolvedQuery = await model.find().where(field).regex(`${value}$`);
    } else if (match === 'includes') {
      resolvedQuery = await model.find().where(field).regex(value);
    } else {
      match = '$' + match;
      resolvedQuery = await model.regex({ [field]: { [match]: value } });
    }
    ctx.body = resolvedQuery;
    return ctx.status = 200;
  }

  // if there is no query, look for the API that has a field: value:
  try {
    const results = await model.find({ [field]: value });
    ctx.body = results;
    ctx.status = 200;
  } catch (error) {
    console.error(`Error in getting value by field from DB for: ${apiName} API`, error);
    ctx.body = { error: `Error in getting value by field from DB for: ${apiName} API` };
    ctx.status = 500;
  }
};


// --- populate the database with data (can take an obj OR an array):

exports.postData = async ctx => {
  const apiName = ctx.params.api_name;
  const data = ctx.request.body;
  const model = require(`../../models/api/${apiName}Model.js`);
  let rows = 0;

  // the number of documents that are to be inserted
  if (Array.isArray(data)) rows = data.length;
  else rows = 1;

  try {
    const results = await model.create(data);
    if (results) {
    // update the API details in our db with the number of rows
      await ApiModel.findOneAndUpdate({ api_name: apiName }, { $inc: { api_row_count: rows } });
      ctx.body = results;
      ctx.status = 200;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`Error inserting data into DB for: ${apiName} API`, error);
    ctx.body = { error: `Error inserting data into DB for: ${apiName} API` };
    ctx.status = 500;
  }
};


// --- populate the database with a csv file:

exports.uploadFile = async ctx => {
  const apiName = ctx.params.api_name;
  const model = require(`../../models/api/${apiName}Model.js`);
  let rows = 0;

  // get the file path that the multer middleware adds to ctx
  const filePath = ctx.files[0].path;

  try {
    const json = await csvtojson().fromFile(filePath);
    if (json) {
      // replace TRUE/FALSE to true/false for mongoose
      const string = JSON.stringify(json);
      const replaced = string.replace('TRUE', 'true').replace('FALSE', 'false');
      const parsed = JSON.parse(replaced);
      rows = json.length;
      const results = await model.create(parsed);
      if (results) {
        await ApiModel.findOneAndUpdate({ api_name: apiName }, { $inc: { api_row_count: rows } });
        // delete file from our directory
        await unlinkAsync(filePath);
        ctx.body = results;
        ctx.status = 200;
      } else { 
        ctx.body = { error: `Could not save file to database for ${apiName} API` };
        ctx.status = 500;
      }
    } else {
      ctx.body = { error: `Could not convert file to JSON for ${apiName} API` };
      ctx.status = 500;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`Error uploading csv file for ${apiName} API`, error);
    ctx.body = { error: `Error uploading csv file for ${apiName} API` };
    ctx.status = 500;
  }
};


// --- to update a document(row):

exports.updateRecord = async ctx => {
  const apiName = ctx.params.api_name;
  const data = ctx.request.body;
  const recordId = ctx.params.id;
  const model = require(`../../models/api/${apiName}Model.js`);

  try {
    const result = await model.findOneAndUpdate({ _id: recordId }, data, { new: true });
    if (result) {
      ctx.body = result;
      ctx.status = 200;
    } else {
      ctx.body = { error: 'ID not found.' };
      ctx.status = 404;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`Error updating record ${recordId} from DB for: ${apiName} API`, error);
    ctx.body = { error: `Error udpating record ${recordId} from DB for: ${apiName} API` };
    ctx.status = 500;
  }
};


// --- delete a document(row):

exports.deleteRecord = async ctx => {
  const apiName = ctx.params.api_name;
  const recordId = ctx.params.id;
  const model = require(`../../models/api/${apiName}Model.js`);

  try {
    const result = await model.findOneAndDelete({ _id: recordId });
    if (result) {
      await ApiModel.findOneAndUpdate({ api_name: apiName }, { $inc: { api_row_count: -1 } });
      ctx.body = result;
      ctx.status = 200;
    } else {
      ctx.body = { error: 'No record found with that ID.' };
      ctx.status = 404;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`Error deleting record from DB for: ${apiName} API`, error);
    ctx.body = { error: `Error deleting record from DB for: ${apiName} API` };
    ctx.status = 500;
  }
};


