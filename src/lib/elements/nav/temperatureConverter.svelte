<script lang="ts">
    class TemperatureConverter {
        
    #cel: number = $state(0);
    #far: number = $state(0);
    
    get cel() {
        return this.#cel;
    }

    set cel(value: number) {
        this.#cel = value;
        this.#far = (value * 9/5) + 32;
    }

    get far() {
        return this.#far;
    }

    set far(value: number) {
        this.#far = value;
        this.#cel = (value - 32) * 5/9;
    }
}
const converter = new TemperatureConverter();
    </script>

<div class="mx-auto m-12 max-w-7xl px-2 sm:px-6 lg:px-8">
    <label for="cel">Temp Celsius</label>
    <input type="text" id="cel" bind:value={converter.cel} />
    <label for="far">Temp Fahrenheit</label>
    <input type="text" id="far" bind:value={converter.far} />
</div>