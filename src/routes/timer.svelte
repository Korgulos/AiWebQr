<script lang="ts">
let time = $state(2);
let timer = $state(0);
let interval: number;
function startTimer(){
    interval = setInterval(() => {
        timer+=0.1;
        if  (timer > time) {
            timer = time;
            clearInterval(interval);
        }
    }, 100);
};

function resetTimer(){
    timer = 0;
    startTimer()
}
$effect(()=>{
if (!time) return
startTimer()
return ()=> clearInterval(interval)
})
</script>
<div class="mx-auto m-12 max-w-7xl px-2 sm:px-6 lg:px-8">
    <div>
        <span>Elapsed time:</span>
        <progress max={time} value={timer}></progress>
    </div>
    <div>
        {timer.toFixed(1)} s
    </div>
    <label for="">
        <span>Duration:</span>
        <input type="range" bind:value={time} min="1" max="10">
    </label>
    <div>
        <button onclick={resetTimer} class="shadow bg-gray-500 hover:bg-gray-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded">Restart</button>
    </div>
</div>