/// <reference path="../../typings/mozilla/window.d.ts" />

import FxOSWebSocket from 'fxos-websocket/server.es6';

interface IJoinedBlob {
  totalSize: number;
  meta: Array<{
    type: string;
    size: number;
  }>;
  data: Uint8Array;
}

function blobToArrayBuffer(blob: Blob) {
  return new Promise<ArrayBuffer>(function(resolve) {
    var reader = new FileReader();

    reader.addEventListener('loadend', function() {
      resolve(reader.result);
    });

    reader.readAsArrayBuffer(blob);
  });
}

function joinBlobs(blobs: Array<Blob>) : Promise<IJoinedBlob> {
  var result = <IJoinedBlob> {
    totalSize: 0,
    meta: [],
    data: null
  };

  var promises = blobs.map(function(blob) {
    var position = result.totalSize;

    result.totalSize += blob.size;

    result.meta.push({ type: blob.type, size: blob.size });

    return blobToArrayBuffer(blob).then(function(buffer) {
      result.data.set(new Uint8Array(buffer), position);
    });
  });

  result.data = new Uint8Array(result.totalSize);

  return Promise.all(promises).then(function() {
    return result;
  });
}

export default {
  send(message: any, blobs: Array<Blob>) : Promise<Uint8Array> {
    var blobsJoinPromise = !blobs || !blobs.length ?
        Promise.resolve<IJoinedBlob>(null) : joinBlobs(blobs);

    return blobsJoinPromise.then(function(blobs) {
      if (blobs) {
        message.__blobs = blobs.meta;
      }

      var serializedApplicationMessage = FxOSWebSocket.Utils.stringToArray(
        JSON.stringify(message)
      );

      var applicationMessageLength = serializedApplicationMessage.length;

      // Two bytes to have size of application message in joined data array
      var dataToSend = new Uint8Array(
        2 + applicationMessageLength + (blobs ? blobs.data.length : 0)
      );

      // Write serialized application message length
      FxOSWebSocket.Utils.writeUInt16(dataToSend, applicationMessageLength, 0);

      // Write serialized application message itself
      dataToSend.set(serializedApplicationMessage, 2);

      if (blobs) {
        dataToSend.set(blobs.data, 2 +  applicationMessageLength);
      }

      return dataToSend;
    });
  },

  receive(messageData: Array<number>) {
    var data = new Uint8Array(messageData);
    var dataOffset = 2;
    var applicationMessageLength = (data[0] << 8) + data[1];

    var applicationMessage = JSON.parse(
      String.fromCharCode.apply(
        null, data.subarray(dataOffset, dataOffset + applicationMessageLength)
      )
    );

    var blobs: Array<Blob>, position: number;
    if (applicationMessage.__blobs && applicationMessage.__blobs.length) {
      position = dataOffset + applicationMessageLength;
      blobs = applicationMessage.__blobs.map(function(meta) {
        position += meta.size;
        return new Blob(
          [data.subarray(position - meta.size, position)],
          { type: meta.type }
        );
      });

      delete applicationMessage.__blobs;
    }

    return {
      message: applicationMessage,
      blobs: blobs
    };
  }
}
