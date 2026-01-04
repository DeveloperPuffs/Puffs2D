export function setup() {
        Starfield.setup({
                auto: false,
                starColor: "rgb(255, 255, 255)",
                canvasColor: "rgb(20, 10, 30)",
                hueJitter: 0,
                trailLength: 0.75,
                baseSpeed: 2.5,
                maxAcceleration: 5,
                accelerationRate: 0.05,
                decelerationRate: 0.05,
                minSpawnRadius: 100,
                maxSpawnRadius: 500
        });
}