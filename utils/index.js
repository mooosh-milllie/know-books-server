const  encodeCursor = cursor =>  Buffer.from(cursor).toString("base64");
const decodeCusor = cursor => Buffer.from(cursor, "base64").toString("ascii");

module.exports = {
  encodeCursor, decodeCusor
}