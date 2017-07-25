var ffmpeg = require('ffmpeg');
var azure = require('azure-storage');
var fs = require('fs');

processFile = (videoName, accountName, accountKey) => {
  var process = new ffmpeg(videoName);
  process.then(function (video) {
    // Callback mode
    video.fnExtractFrameToJPG('/home/utils/frames/', {
      start_time: `0:00:01`,
      frame_rate : 1, // a frame per second
      file_name : `frm_%t_%s`
    }, function (error, files) {
      if (error) {
        console.log('failed extracting frames:' + error);
        return;
      }
      console.log('Frames: ' + files);
       
	    fs.unlink(videoName, function (error, files) {
	           if (!error) {
			           console.log('deleted file');
			       }
	           if (error) {
			           console.log('error deleting file: ' + error);
			       }
      });

      console.log('deleted vid file');
      // creating perstistent storage elements (blob and queue):
      var blobService = azure.createBlobService(accountName, accountKey);
      var queueService = azure.createQueueService(accountName, accountKey);
      blobService.createContainerIfNotExists(
        'imagestoprocess', 
        { 
          publicAccessLevel: 'blob'
        }, 
        function(error, result, response) {
          if (error) {
            console.log('failed creating blob container');
            return;
          }
        
          console.log('have blob container');
          queueService.createQueueIfNotExists(
            'imagestoprocess', 
            function(error, result, response) {
              if(error) {
                console.log('failed creating queue');
                return;
              }
          
              console.log('have queue');
              handleFiles(files, queueService, blobService);
          });
      });
  });
}, function (err) {
    console.log('Error: ' + err);
});
}

deleteFile = (element) => {
    fs.unlink(element, function (error, files) {
    if (!error) {
        console.log('deleted file');
    }
    if (error) {
        console.log('error deleting file: ' + error);
    }
});
};

handleFiles = (files, queueService, blobService) => {
  files.forEach(function(element) {
    var fName = element.substr(element.lastIndexOf('/') + 1);
    blobService.createBlockBlobFromLocalFile(
      'imagestoprocess', 
      fName, 
      element, 
      function(error, result, response) {
        if (error) {
            console.log('error creating blob item:' + error);
        }
        
        // file uploaded. now lets save the message into the queue and delete the file
        console.log('file saved into blob');
        queueService.createMessage(
          'imagestoprocess', 
          fName, 
          function(error) {
            // Queue created or exists
            if (error) {
              console.log('error creating queue message:' + error);
            }
            
            console.log('sent msg');
            deleteFile(element);
          });
      });
  });
};

var exports = module.exports = { processFile };
