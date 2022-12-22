import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";

const state = {
    actors: new Set(),
    totalDamageByActor: {},
    hullDamageByActor: {},
    mitigatedDamageByActor: {},
    hullDamageTakenByActor: {},
    mitigatedDamageTakenByActor: {},
    shieldDamageTakenByActor: {},
    totalDamageTakenByActor: {},
    mitigationByActor: {},
    mitigatedByActor: {},
    atk: []
}

const getActorName = (name, ship) => ship + '_' + name
const createDamageInstances = combatRow => {

    const [round,, type,name,alliance,ship,,target_name,,target_ship,,crit,hull_damage,shield_damage,mitigated_damage,total_damage] = combatRow
    const actor = getActorName(name, ship)
    const target = getActorName(target_name, target_ship)
    state.actors.add(actor)
    state.totalDamageByActor[actor] = (state.totalDamageByActor[actor] || 0) + Number(total_damage)
    state.hullDamageByActor[actor] = (state.hullDamageByActor[actor] || 0) + Number(hull_damage)
    state.mitigatedDamageByActor[actor] = (state.mitigatedDamageByActor[actor] || 0) + Number(mitigated_damage)
    state.hullDamageTakenByActor[target] = (state.hullDamageTakenByActor[target] || 0) + Number(hull_damage)
    state.shieldDamageTakenByActor[target] = (state.shieldDamageTakenByActor[target] || 0) + Number(shield_damage)
    state.mitigatedDamageTakenByActor[target] = (state.mitigatedDamageTakenByActor[target] || 0) + Number(mitigated_damage)
    state.totalDamageTakenByActor[target] = (state.totalDamageTakenByActor[target] || 0) + Number(total_damage)
        const meta = {
            actor,
            target,
            crit: crit === 'YES',
            round: Number(round)
        };
        return [
            { ...meta, damage: Number(hull_damage), damage_type: 'hull_damage' },
            { ...meta, damage: Number(shield_damage), damage_type: 'shield_damage' },
            { ...meta, damage: Number(mitigated_damage), damage_type: 'mitigated_damage' },
            { ...meta, damage: Number(total_damage), damage_type: 'total_damage' },
        ]
}

const addDerivedStats = () => {
    state.actors.forEach(actor => {
        state.mitigationByActor[actor] = (state.mitigatedDamageByActor[actor] / state.totalDamageByActor[actor]).toFixed(2)
        state.mitigatedByActor[actor] = (state.mitigatedDamageTakenByActor[actor] / state.totalDamageTakenByActor[actor]).toFixed(2)
    })
    console.log(state)
    
}

const processCombat = combatRow => {
    const [round,, type,name,alliance,ship,,target_name,,target_ship,,crit,hull_damage,shield_damage,mitigated_damage,total_damage] = combatRow
    // const actor = getActorName(name, ship)
    // const target = getActorName(target_name, target_ship)
    if (type === 'Attack') {
        state.atk.push(...createDamageInstances(combatRow))
    }
}

const graphDamageTakenByRound = () => {
    const graphParent = document.getElementById('damage-taken')
    graphParent.innerHTML = ''
    graphParent.append(Plot.plot({
        color: {legend: true},
        marginLeft: 100,
        width: 1600,
        caption: 'Damage Taken',
        grid: true,
        facet:{ data: state.atk, y: 'target' },
        fy: { labelOffset: -20 },
        // y: {type: 'log', base: 10},
        marks: [
            // Plot.barY(dataset, { x: 'round', y: 'damage', fill: 'damage_type' }),
            Plot.areaY(state.atk, Plot.groupX({ y: 'sum' }, {  x: 'round', y: 'damage', fill: 'damage_type', curve: 'natural' })),
            // Plot.lineY(state.atk, {  x: 'round', y: 'damage', stroke: 'damage_type', title: 'damage' }),
            // Plot.lineY(dataset, {filter: d => d.damage_type === 'total_damage', x: 'round', y: 'damage' }),
        ]
    }));
}

const graphDamageByRound = () => {
    const graphParent = document.getElementById('damage-done')
    graphParent.innerHTML = ''
    graphParent.append(Plot.plot({
        color: {legend: true},
        marginLeft: 100,
        width: 1600,
        caption: 'Damage Done',
        grid: true,
        facet:{ data: state.atk, y: 'actor' },
        fy: { labelOffset: -20 },
        // y: {type: 'log', base: 10},
        marks: [
            // Plot.barY(dataset, { x: 'round', y: 'damage', fill: 'damage_type' }),
            Plot.areaY(state.atk, Plot.groupX({ y: 'sum' }, {  x: 'round', y: 'damage', fill: 'damage_type', curve: 'natural' })),
            // Plot.lineY(state.atk, {  x: 'round', y: 'damage', stroke: 'damage_type', title: 'damage' }),
            // Plot.tooltip(state.atk, Plot.groupX({ y: 'sum' }, {  x: 'round', y: 'damage' })),
            // Plot.lineY(dataset, {filter: d => d.damage_type === 'total_damage', x: 'round', y: 'damage' }),
        ]
    }));
}

const graphDamageList = () => {
    const graphParent = document.getElementById('damage-list')
    graphParent.innerHTML = ''
    graphParent.append(Plot.plot({
        color: {legend: true},
        marginLeft: 100,
        width: 1600,
        grid: true,
        x: { type: 'log', ticks: 5 },
        // facet:{ data: state.atk, y: 'crit' },
        marks: [
            Plot.barX(state.atk, Plot.groupY({ x: 'sum' }, { x: 'damage', y: 'actor', fill: 'damage_type' })),
            // Plot.barX(state.atk, { filter: i => i.damage_type === 'hull_damage', x: 'damage', y: 'actor' }),
        ]
    }));
}

const process = log => {
    let segment = 0
    log
    .split('\n')
    .map(i => i.split('\t').map(cell => cell.replace('\r', '')))
    .reduce((acc, row) => {
        if (row.join() === '') {
            segment += 1
        } else if (acc[segment]) {
            if (segment === 3) processCombat(row)
            acc[segment].push(row)
        } else {
            console.log(segment, row)
            acc[segment] = [row]
        }
        return acc
    }, [])
    .forEach(table => {
        const t = document.createElement('table')
        const thead = document.createElement('thead')
        const tbody = document.createElement('tbody')
        t.appendChild(thead)
        t.appendChild(tbody)
        table.forEach((row, idx) => {
            if (idx === 0) {
                const tr = document.createElement('tr')
                row.forEach(cell => {
                    const th = document.createElement('th')
                    th.innerHTML = cell
                    tr.appendChild(th)
                })
                thead.appendChild(tr)
            } else {
                const tr = document.createElement('tr')
                row.forEach(cell => {
                    const td = document.createElement('td')
                    td.innerHTML = cell
                    tr.appendChild(td)
                })
                tbody.appendChild(tr)
            }
        })
        document.body.appendChild(t)
    })
}

const input = document.getElementById('log-picker')
input.addEventListener('change', e => {
    input.files[0].text().then(process).then(() => {
        addDerivedStats();
        graphDamageByRound();
        graphDamageTakenByRound();
        graphDamageList();
    })
})
