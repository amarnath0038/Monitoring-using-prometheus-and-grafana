import express from "express";
import client from "prom-client";
import type {Request, Response, NextFunction} from "express";

const app = express();
app.use(middleware);

const reqCounter = new client.Counter({
    name: "Total_http_requests",
    help: "Number of http requests",
    labelNames: ["method", "route", "statusCode"]
});

const activereqGauge = new client.Gauge({
    name: "active_reqs",
    help: "Number of active requests"
});

const reqDuration = new client.Histogram({
    name: "http_req_duration_ms",
    help: "Duration of http reqs in ms",
    labelNames: ["method", "route", "statusCode"],
    buckets: [0.1, 5, 15, 30, 50, 100, 1000, 5000]
})

function middleware(req: Request, res: Response, next: NextFunction){
    if (req.originalUrl !== "/metrics"){
        activereqGauge.inc()
    }

    const startTime = Date.now();
    res.on("finish", () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`Time took : ${duration}} ms`);

        reqCounter.inc({
            method: req.method,
            route: req.originalUrl,
            statusCode: res.statusCode
        });

        if (req.originalUrl !== "/metrics"){
            activereqGauge.dec()
        }

        reqDuration.observe({
            method: req.method,
            route: req.originalUrl,
            statusCode: res.statusCode
        }, duration)
    });

    next();
}

app.get("/cpu", async (req,res) => {
    await new Promise(x => setTimeout(x, Math.random() * 1000))
    res.json({
        message: "cpu"
    });
});

app.get("/users", (req,res) => {
    res.json({
        message: "user"
    });
});

app.get("/metrics", async (req,res) => {
    const metrics = await client.register.metrics();
    console.log(client.register.contentType);
    res.set("Content-Type", client.register.contentType);
    res.end(metrics);
})


app.listen(3000, () => {
    console.log("Listening on port 3000");
});