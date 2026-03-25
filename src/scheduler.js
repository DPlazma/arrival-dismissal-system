const { getVehicles, setVehicles, saveVehiclesData, createBackup, VEHICLES_DATA_FILE } = require('./data');
const vehicleRoutes = require('./routes/vehicles');

const updateTaxiStatus = vehicleRoutes.updateTaxiStatus;

async function resetForAfternoonDismissal() {
    await createBackup(VEHICLES_DATA_FILE);
    let resetCount = 0;
    getVehicles().forEach(vehicle => {
        if (vehicle.status === 'arrived') {
            vehicle.status = 'not-arrived';
            vehicle.arrivalTime = null;
            resetCount++;
        }
        if (vehicle.type !== 'bus') {
            vehicle.students.forEach(student => {
                if (student.status === 'arrived') student.status = 'not-arrived';
            });
            updateTaxiStatus(vehicle);
        }
    });

    await saveVehiclesData();
    console.log(`🕛 Afternoon dismissal reset: ${resetCount} vehicles reset from 'arrived' to 'not-arrived' at ${new Date().toLocaleString()}`);
    console.log(`📋 Absent vehicles/students remain marked as absent`);
}

async function resetForNewDay() {
    await createBackup(VEHICLES_DATA_FILE);
    let resetCount = 0;
    let adhocRemoved = 0;

    const filtered = getVehicles().filter(vehicle => {
        if (vehicle.type === 'adhoc') { adhocRemoved++; return false; }
        return true;
    });
    setVehicles(filtered);

    getVehicles().forEach(vehicle => {
        if (vehicle.status !== 'not-arrived') {
            vehicle.status = 'not-arrived';
            vehicle.arrivalTime = null;
            resetCount++;
        }
        if (vehicle.type !== 'bus') {
            vehicle.students.forEach(student => { student.status = 'not-arrived'; });
        }
    });

    await saveVehiclesData();
    console.log(`🌅 End of day reset: ${resetCount} vehicles reset to 'not-arrived', ${adhocRemoved} ad-hoc vehicles removed at ${new Date().toLocaleString()}`);
}

function scheduleAutomatedResets() {
    const now = new Date();

    const midday = new Date();
    midday.setHours(12, 0, 0, 0);
    if (midday <= now) midday.setDate(midday.getDate() + 1);

    const millisecondsUntilMidday = midday.getTime() - now.getTime();
    setTimeout(async () => {
        await resetForAfternoonDismissal();
        setInterval(async () => { await resetForAfternoonDismissal(); }, 24 * 60 * 60 * 1000);
    }, millisecondsUntilMidday);

    const endOfDay = new Date();
    endOfDay.setHours(18, 0, 0, 0);
    if (endOfDay <= now) endOfDay.setDate(endOfDay.getDate() + 1);

    const millisecondsUntilEndOfDay = endOfDay.getTime() - now.getTime();
    setTimeout(async () => {
        await resetForNewDay();
        setInterval(async () => { await resetForNewDay(); }, 24 * 60 * 60 * 1000);
    }, millisecondsUntilEndOfDay);

    console.log(`⏰ Automated resets scheduled:`);
    console.log(`   📅 Afternoon reset: ${midday.toLocaleString()} (arrived → not-arrived)`);
    console.log(`   🌙 End of day reset: ${endOfDay.toLocaleString()} (all → not-arrived)`);
}

module.exports = { resetForAfternoonDismissal, resetForNewDay, scheduleAutomatedResets };
