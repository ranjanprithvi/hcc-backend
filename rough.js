async function ProcessAsync() {
    setTimeout(function () {
        console.log("Async End");
    }, 2000);
}

await ProcessAsync();
setTimeout(() => {
    console.log("Timeout End");
}, 1000);
console.log("End");
