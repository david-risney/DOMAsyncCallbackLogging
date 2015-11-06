(function (root) {
    "use strict";

    function arrayFrom(arrayLike) {
        var array = [];
        for (var idx = 0; idx < arrayLike.length; ++idx) {
            array.push(arrayLike[idx]);
        }
        return array;
    }

    function shimFunction(container, functionName, replacementFunction) {
        if (container[functionName]) {
            var originalFunction = container[functionName];
            var newWrapperFunction = function () {
                var argumentsArray = arrayFrom(arguments);
                var boundOriginalFunction = originalFunction.bind.apply(originalFunction, [this].concat(argumentsArray));
                var shimPackage = {
                    originalFunction: originalFunction,
                    this: this,
                    arguments: argumentsArray,
                    boundOriginalFunction: boundOriginalFunction
                };

                return replacementFunction.apply(this, [shimPackage].concat(argumentsArray));
            }

            container[functionName] = newWrapperFunction;
            console.log("Now shimming " + functionName);
        }
    }

    var count = 0;
    function logSchedulerFunction(container, schedulerFunctionName) {
        shimFunction(container, schedulerFunctionName, function (scheduledShimPackage) {
            var scheduledTime = (new Date()).getTime();
            var scheduledCount = count++;
            var scheduledArguments = scheduledShimPackage.arguments;

            // This will modify scheduledArguments in place which we use below.
            shimFunction(scheduledArguments, 0, function (callbackShimPackage) {
                var callbackTime = (new Date()).getTime();

                console.log(scheduledCount + " " + schedulerFunctionName + " dispatched (" + (callbackTime - scheduledTime) + "ms elapsed)");
                callbackShimPackage.boundOriginalFunction();
            });

            console.log(scheduledCount + " " + schedulerFunctionName + " scheduled");
            scheduledShimPackage.originalFunction.apply(scheduledShimPackage.this, scheduledShimPackage.arguments);
        });
    }

    logSchedulerFunction(root, "setImmediate");
    logSchedulerFunction(root, "setTimeout");

    if (root.MSApp && root.MSApp.execAsyncAtPriority && root.MSApp.isTaskScheduledAtPriorityOrHigher) {
        // logSchedulerFunction(root.MSApp, "execAtPriority"); // Shouldn't need the sync version of this.
        logSchedulerFunction(root.MSApp, "execAsyncAtPriority");

        shimFunction(root.MSApp, "isTaskScheduledAtPriorityOrHigher", function (shimPackage) {
            var result = shimPackage.boundOriginalFunction();
            console.log("     isTaskScheduledAtPriorityOrHigher(" + shimPackage.arguments[0] + ") is " + result);
        });
    }
})(this);
