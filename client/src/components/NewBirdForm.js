import { useState } from "react";

function NewBirdForm({ onAddBird }) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [image, setImage] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    fetch("/birds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name,
        species: species,
        image: image,
      }),
    })
      .then((r) => r.json())
      .then((newBird) => onAddBird(newBird));
  }

  return (
    <div className="new-bird-form">
      <h2>New Bird</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Bird name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          name="species"
          placeholder="Species"
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
        />
        <input
          type="text"
          name="image"
          placeholder="Image URL"
          value={image}
          onChange={(e) => setImage(e.target.value)}
        />
        <button type="submit">Add Bird</button>
      </form>
    </div>
  );
}

export default NewBirdForm;
