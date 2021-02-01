
let configStore={};
let requestStore={};



function RateLimit(options){
    options = Object.assign(
    {
        windowMs: 1 * 60 * 1000, // milliseconds - how long to keep records of requests in memory
        max: 5, // max number of recent connections during `window` milliseconds before sending a 429 response
        message: "Too many requests, please try again later.",
        statusCode: 429, // 429 status = Too Many Requests (RFC 6585)
        
    },
    options
    );

    function lateLimit(req, res, next){

        let currentTime = Date.now();
        let key=req.ip;


        let config = configStore[key];
        if(config==null){
            config=options;
            configStore[key]=config;
        }



        let startTime=currentTime - config.windowMs;



        //get records by key from request store
        let records=requestStore[key];
        if(records==null){
            //if records are not exist, create one
            let newRecord = [];
            let request = {
                requestTimeStamp: currentTime,
                requestCount: 1
            };
            newRecord.push(request);
            requestStore[key]=JSON.stringify(newRecord);
            
            return next();
        }
        
        
        
        
        //filter records that greater than start time   
        let data = JSON.parse(records);
        let requestsWithinWindow = data.filter(entry => {
            return entry.requestTimeStamp > startTime;
        });
        requestStore[key] = JSON.stringify(requestsWithinWindow);

        let totalCountWithinWindow = requestsWithinWindow.reduce((accumulator, entry) => {
            return accumulator + entry.requestCount;
        }, 0);





        if(totalCountWithinWindow>=options.max){
            res.setHeader("X-RateLimit-Limit", options.max)
            return res.status(options.statusCode).send(options.message)
        }else{
            
            /* 
            if last request time is within 1 minute, then just increase count of last request
            if last request time is not in 1 minute, insert a log to the store
            */
            // let lastRequest = data[data.length - 1];
            // if (lastRequest.requestTimeStamp > startTime) {
            //     lastRequest.requestCount++;
            //     data[data.length - 1] = lastRequest;
            // } else {
            //     data.push({
            //         requestTimeStamp: currentTime,
            //         requestCount: 1
            //     });
            // }
            data.push({
                    requestTimeStamp: currentTime,
                    requestCount: 1
                });
            // update the store
            requestStore[key]=JSON.stringify(data);
        }

        next();
    }

    return lateLimit;
};

module.exports=RateLimit;