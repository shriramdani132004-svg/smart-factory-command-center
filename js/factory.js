// factory.js
const FACTORY = {
    factoryId: "FAC-001",
    name: "Smart Factory Command Center",
    departments: [
        {
            departmentId: "DEPT-01",
            name: "Machining",
            productionLines: [
                { lineId: "LINE-01", name: "CNC Line A" },
                { lineId: "LINE-02", name: "CNC Line B" },
                { lineId: "LINE-03", name: "Cutting Line" }
            ]
        },
        {
            departmentId: "DEPT-02",
            name: "Assembly",
            productionLines: [
                { lineId: "LINE-04", name: "Robotic Assembly Line A" },
                { lineId: "LINE-05", name: "Robotic Assembly Line B" },
                { lineId: "LINE-06", name: "Welding Line" }
            ]
        },
        {
            departmentId: "DEPT-03",
            name: "Packaging",
            productionLines: [
                { lineId: "LINE-07", name: "Packaging Line A" },
                { lineId: "LINE-08", name: "Packaging Line B" }
            ]
        },
        {
            departmentId: "DEPT-04",
            name: "Molding & Drilling",
            productionLines: [
                { lineId: "LINE-09", name: "Injection Molding Line" },
                { lineId: "LINE-10", name: "Drilling Line" }
            ]
        }
    ]
};

const MACHINE_TYPES = [
    "CNC Machine", "Robotic Arm", "Conveyor", "Press Machine",
    "Welding Robot", "Assembly Robot", "Packaging Machine",
    "Cutting Machine", "Drilling Machine", "Injection Molding Machine"
];

const MACHINE_STATES = [
    "RUNNING", "IDLE", "PAUSED", "STOPPED", "STARTING",
    "STOPPING", "MAINTENANCE", "FAULT", "OFFLINE", "EMERGENCY_STOP"
];

if (typeof module !== "undefined") {
    module.exports = { FACTORY, MACHINE_TYPES, MACHINE_STATES };
}
