export const MOCK_HORSES = [
    { id: 1, name: 'Sakura Storm', name_en: 'Sakura Storm', yob: 2020, gender: 'Mare', dam: 'Flower', sire: 'Storm', created_at: '2023-01-01' },
    { id: 2, name: 'Thunder Bolt', name_en: 'Thunder Bolt', yob: 2019, gender: 'Stallion', dam: 'Lightning', sire: 'Sky', created_at: '2023-01-01' },
    { id: 3, name: 'Fuji Spirit', name_en: 'Fuji Spirit', yob: 2021, gender: 'Gelding', dam: 'Mountain', sire: 'Spirit', created_at: '2023-02-01' },
];

export const MOCK_CLIENTS = [
    { id: 1, name: 'Demo Stable', email: 'demo@example.com' },
    { id: 2, name: 'Global Racing', email: 'racing@example.com' },
];

export const MOCK_REPORTS = [
    {
        id: '101',
        title: 'January Training Report',
        created_at: new Date().toISOString(),
        horse_id: 1,
        status_training: 'Training',
        body: 'Doing well.',
        metrics_json: { commentEn: 'Doing well.' },
        horses: MOCK_HORSES[0]
    },
    {
        id: '102',
        title: 'Vet Check',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        horse_id: 2,
        status_training: 'Resting',
        body: 'Recovering.',
        metrics_json: { commentEn: 'Recovering.' },
        horses: MOCK_HORSES[1]
    },
    {
        id: '103',
        title: 'Weekly Update',
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        horse_id: 3,
        status_training: 'Spelling',
        body: 'Grazing field.',
        metrics_json: { commentEn: 'Grazing.' },
        horses: MOCK_HORSES[2]
    }
];
