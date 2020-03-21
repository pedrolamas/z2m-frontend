import { h, ComponentChild, Component, Fragment } from "preact";
import { Dictionary } from "../../types";




import { WebsocketMessage, ZigbeePayload } from "./types";
import DeviceCard from "./device-card";
import Button from "../button";
import { enableJoin } from "../actions";


interface DiscoveryState {
    updateTimerId: number;

    joinDuration: number;
    events: Dictionary<ZigbeePayload[]>;
}

export default class Discovery extends Component<{}, DiscoveryState> {
    constructor() {
        super();

        this.state = {
            updateTimerId: 0,
            joinDuration: 0,
            events: {}
        }

    }
    processZigbeeEvent(message: ZigbeePayload): void {
        console.log('processZigbeeEvent', message);
        message.timestamp = Date.now();
        const { events } = this.state;
        const { nwkAddr } = message;
        let { joinDuration, updateTimerId } = this.state;
        switch (message.event) {
            case "LinkData":
            case "LeaveInd":
                break;
            case "PermitJoin":
                joinDuration = message.duration;
                window.clearInterval(updateTimerId);


                updateTimerId = window.setInterval(() => {
                    const { joinDuration, updateTimerId } = this.state;
                    if (joinDuration <= 0) {
                        window.clearInterval(updateTimerId);
                    } else {
                        this.setState({ joinDuration: joinDuration - 1 })
                    }

                }, 1000);
                // console.log("LinkData", payload.payload);
                break;
            default:
                if (events[nwkAddr]) {
                    events[nwkAddr].push(message);
                } else {
                    events[nwkAddr] = [message];
                }
                break;

        }
        this.setState({ events, joinDuration, updateTimerId });
    }
    onMessageReceive = (wsEvent: MessageEvent): void => {
        let event = {} as WebsocketMessage;
        try {
            event = JSON.parse(wsEvent.data) as WebsocketMessage;
        } catch (e) {
            console.error('Cant parse json', e);
        }
        switch (event.category) {
            case "log":
                // console.log(event.payload);
                break;
            case "zigbee":
                this.processZigbeeEvent(event.payload as ZigbeePayload);
                break;
            default:
                console.warn("Unknown event", event);
                break;
        }
    };
    connectWS = (): void => {
        // const ws = new WebSocket("ws://localhost:8579/");
        // ws = new WebSocket("ws://192.168.1.209:81/log");
        let ws: WebSocket;
        const { hostname } = document.location;
        if (hostname === 'localhost') {
            ws = new WebSocket("ws://localhost:8579/");
        } else {
            ws = new WebSocket(`ws://${document.location.hostname}:81/log`);
        }
        ws.addEventListener("open", (): void => {
            console.log("[WS] Connected!");
            this.enableJoin();
            ws.send("hello");
        });

        ws.addEventListener("message", this.onMessageReceive);
        ws.addEventListener("error", (event) => {
            console.error("[WS] error", event);
            setTimeout(this.connectWS, 1000);
        });
        ws.send("hello");
    };


    componentDidMount(): void {
        this.connectWS();

    }
    renderDevices(): ComponentChild {
        const { events } = this.state;
        return (<Fragment>
            {this.renderJoinButton()}
            <div className="row no-gutters">{Object.entries(events).map(([nwkAddr, events]) => <DeviceCard nwkAddr={nwkAddr} events={events} />)}</div>
        </Fragment>);

    }
    enableJoin = (): void => {
        enableJoin(255, undefined, () => {
            console.log("Enabled");
        });
    };
    disableJoin = (): void => {
        enableJoin(0, undefined, () => {
            console.log("Disabled");
        });
    };
    renderJoinButton(): ComponentChild {
        const { joinDuration } = this.state;

        return (<div class="row h-100 justify-content-center align-items-center">
            {joinDuration <= 0 ? <Button<void> className="btn btn-success" onClick={this.enableJoin} item={undefined}>Enable join</Button> : <div>Join enabled for {joinDuration} seconds, <a href="#" onClick={this.disableJoin}>Stop</a></div>}
        </div>);
    }
    renderEmptyScreen(): ComponentChild {
        return (
            <div class="container h-100">
                <div class="row h-100 justify-content-center align-items-center">
                    <h2>Nothing yet happened</h2>
                </div>
                {this.renderJoinButton()}
            </div>
        )
    }


    render(): ComponentChild {
        const { events } = this.state;
        const hasAnyEvents = Object.keys(events).length !== 0;
        return hasAnyEvents ? this.renderDevices() : this.renderEmptyScreen();
    }

}