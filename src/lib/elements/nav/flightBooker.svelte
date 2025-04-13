<script lang="ts">
     type Options = "one-way" | "return";

     let selected = $state<Options>("one-way");
     let startDate = $state(getDate());
     let returnDate = $state(getDate());

     const handleSubmit = (event: Event) => {
        event.preventDefault();
        if (getTimeStamp(startDate)< getTimeStamp(getDate())) {
            alert("You must select a future day date");
            return;
        }else if (returnDate < startDate) {
            alert("You must select a return day higher then start day date");
            return;}
        else if (selected === "return") {
            alert(`You selected ${selected} where are staring dates ${startDate} and return date ${returnDate}`);
        }else if (selected === "one-way") {
            alert(`You selected ${selected} where are staring dates ${startDate}`);
        }
     }

     function getTimeStamp(date:string){
        let dateObject = new Date(date);
        return dateObject.getTime();
     }

     function getDate() {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth()+1;
        const day = date.getDate();
        return `${year}-${month}-${day}`;
     }

     $inspect({selected, startDate, returnDate, getDate});
</script>

<div class="mx-auto m-12 max-w-7xl px-2 sm:px-6 lg:px-8">
    <form onsubmit={handleSubmit}>
        <select bind:value={selected} class="block bg-white border border-gray-400 hover:border-gray-500 m-8 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline">
            <option value="one-way">One-way flight</option>
            <option value="return">Return flight</option>
        </select>
        <label class="md:flex md:items-center mb-6">
            <span>Select start date:</span>
            <input type="date" bind:value={startDate} min={getDate()}/>
        </label>
        {#if (selected === "return")}
        <label class="md:flex md:items-center mb-6">
            <span>Select return date:</span>
            <input type="date" bind:value={returnDate} min={getDate()}/>
        </label>
        {/if}
        <button type="submit" class="shadow bg-gray-500 hover:bg-gray-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded">Book</button>
    </form>
</div>