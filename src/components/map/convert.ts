import { GATEWAY } from './consts';
import { GraphI, NodeI, LinkType } from './types';
import { Device, DeviceType } from '../../types';
import { genDeviceShortAddress } from '../../utils';

const getName = (device: Device): string => {
	const { friendly_name: friendlyName } = device;
	return friendlyName ?? `${genDeviceShortAddress(device.nwkAddr) ?? 'Unknown device'}`;
};
export const convert2graph = (devices: Device[]): GraphI => {
	const coordinator: NodeI = {
		id: 'SLS GW',
		device: GATEWAY,
		name: 'GW'
	};

	const graph: GraphI = {
		nodes: [coordinator],
		links: []
	};
	const getLinkType = (source: DeviceType, dest: DeviceType): LinkType => `${source}2${dest}` as LinkType;

	devices.forEach((deviceData) => {
		graph.nodes.push({
			id: deviceData.nwkAddr,
			name: getName(deviceData),
			device: deviceData
		});
		if (Array.isArray(deviceData.Rtg) && deviceData.Rtg.length) {
			deviceData.Rtg.forEach(route => {
				graph.links.push({
					source: deviceData.nwkAddr,
					target: route.toString(),
					linkQuality: deviceData?.st?.linkquality,
					type: getLinkType(deviceData.type, devices.find(d => d.nwkAddr == route.toString()).type)
				});
			});
		}
		else {
			graph.links.push({
				source: deviceData.nwkAddr,
				target: coordinator.id,
				linkQuality: deviceData?.st?.linkquality,
				type: getLinkType(deviceData.type, "Coordinator")
			});
		}
	});
	return graph;
};
