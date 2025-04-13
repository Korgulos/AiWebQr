export class SwitchState {
	value = $state(0);
	state(value: number) {
		this.value = value;
	}
}
