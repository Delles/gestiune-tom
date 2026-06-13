export type RomanianHoliday = {
    date: string;
    name: string;
};

const toDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;

const makeLocalDate = (year: number, month: number, day: number) =>
    new Date(year, month - 1, day, 12);

const addDays = (date: Date, days: number) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
};

const getOrthodoxEaster = (year: number) => {
    const a = year % 4;
    const b = year % 7;
    const c = year % 19;
    const d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31);
    const day = ((d + e + 114) % 31) + 1;
    const julianToGregorianDays =
        Math.floor(year / 100) - Math.floor(year / 400) - 2;

    return addDays(makeLocalDate(year, month, day), julianToGregorianDays);
};

export const getRomanianPublicHolidays = (
    year: number
): RomanianHoliday[] => {
    const easter = getOrthodoxEaster(year);
    const fixedHolidays: RomanianHoliday[] = [
        { date: toDateKey(makeLocalDate(year, 1, 1)), name: "Anul Nou" },
        { date: toDateKey(makeLocalDate(year, 1, 2)), name: "Anul Nou" },
        { date: toDateKey(makeLocalDate(year, 1, 6)), name: "Boboteaza" },
        {
            date: toDateKey(makeLocalDate(year, 1, 7)),
            name: "Sfantul Ioan Botezatorul",
        },
        {
            date: toDateKey(makeLocalDate(year, 1, 24)),
            name: "Ziua Unirii Principatelor Romane",
        },
        { date: toDateKey(makeLocalDate(year, 5, 1)), name: "Ziua Muncii" },
        {
            date: toDateKey(makeLocalDate(year, 6, 1)),
            name: "Ziua Copilului",
        },
        {
            date: toDateKey(makeLocalDate(year, 8, 15)),
            name: "Adormirea Maicii Domnului",
        },
        {
            date: toDateKey(makeLocalDate(year, 11, 30)),
            name: "Sfantul Andrei",
        },
        {
            date: toDateKey(makeLocalDate(year, 12, 1)),
            name: "Ziua Nationala a Romaniei",
        },
        { date: toDateKey(makeLocalDate(year, 12, 25)), name: "Craciunul" },
        { date: toDateKey(makeLocalDate(year, 12, 26)), name: "Craciunul" },
    ];

    const movableHolidays: RomanianHoliday[] = [
        { date: toDateKey(addDays(easter, -2)), name: "Vinerea Mare" },
        { date: toDateKey(easter), name: "Pastele Ortodox" },
        { date: toDateKey(addDays(easter, 1)), name: "A doua zi de Paste" },
        { date: toDateKey(addDays(easter, 49)), name: "Rusaliile" },
        {
            date: toDateKey(addDays(easter, 50)),
            name: "A doua zi de Rusalii",
        },
    ];

    return [...fixedHolidays, ...movableHolidays].sort((a, b) =>
        a.date.localeCompare(b.date)
    );
};

export const getRomanianPublicHolidayMap = (year: number) =>
    getRomanianPublicHolidays(year).reduce((holidayMap, holiday) => {
        const existingHoliday = holidayMap.get(holiday.date);
        holidayMap.set(
            holiday.date,
            existingHoliday
                ? `${existingHoliday} / ${holiday.name}`
                : holiday.name
        );

        return holidayMap;
    }, new Map<string, string>());

export const formatDateKey = toDateKey;
