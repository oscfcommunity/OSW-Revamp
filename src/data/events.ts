export interface Event {
    title: string;
    startDate: string; // ISO string
    endDate: string;   // ISO string
    link: string;
    location?: string;
    type?: "Meetup" | "Workshop" | "Conference";
}

export const events: Event[] = [
    {
        title: "GDG Ahmedabad DevFest 2025 - Season 11",
        startDate: "2025-11-15T02:30:00",
        endDate: "2025-11-15T12:00:00",
        link: "https://devfest25.gdgahmedabad.com/",
        type: "Conference"
    },
    {
        title: "Developing and Deploying Cloud-Native Application Securely",
        startDate: "2025-11-16T05:30:00",
        endDate: "2025-11-16T07:30:00",
        link: "https://gdg.community.dev/events/details/google-gdg-cloud-gandhinagar-presents-developing-and-deploying-cloud-native-application-securely-using-workload-identity-federation/",
        type: "Workshop"
    },
    {
        title: "AI X DevOps X Web Meetup - Powered by Fiberplane",
        startDate: "2025-11-22T04:30:00",
        endDate: "2025-11-22T07:30:00",
        link: "https://www.meetup.com/gujarat-devoops-meetup-group/events/311925701/",
        type: "Meetup"
    },
    {
        title: "Product Meetup Ahmedabad",
        startDate: "2025-11-23T04:30:00",
        endDate: "2025-11-23T07:30:00",
        link: "#",
        type: "Meetup"
    },
    {
        title: "The Hacker's Meetup - Ahmedabad Chapter",
        startDate: "2025-11-30T04:30:00",
        endDate: "2025-11-30T08:30:00",
        link: "https://luma.com/user/usr-HPrnuEkDzxKiz3O",
        type: "Meetup"
    },
    {
        title: "Grafana Labs: Ahmedabad Happy Hours #6",
        startDate: "2025-12-06T04:30:00",
        endDate: "2025-12-06T07:30:00",
        link: "https://www.meetup.com/grafana-and-friends-ahmedabad-happy-hour/events/311918044/",
        type: "Meetup"
    }
];
