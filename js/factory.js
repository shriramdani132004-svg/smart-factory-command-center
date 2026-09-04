// factory.js
// Factory Structure: Factory -> Departments -> Production Lines -> Machines -> Sensors -> Processes

const FACTORY = {
    factoryId: "FAC-001",
    name: "Smart Factory Command Center",
    departments: [
        {
            departmentId: "DEPT-01",
            name: "Machining",
            productionLines: [
                { lineId: "LINE-01", name: "CNC Line A" },
                { lineId: "LINE-02", name: "CNC Line B" }
            ]
        },
        {
            departmentId: "DEPT-02",
            name: "Assembly",
            productionLines: [
                { lineId: "LINE-03", name: "Robotic Assembly Line" },
                { lineId: "LINE-04", name: "Welding Line" }
            ]
        },
        {
            departmentId: "DEPT-03",
            name: "Packaging",
            productionLines: [
                { lineId: "LINE-05", name: "Packaging Line A" }
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
