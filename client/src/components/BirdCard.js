import { useState } from "react";

function BirdCard({ bird }) {
  const { name, species, image } = bird;

  const [isInStock, setIsInStock] = useState(true);

  function handleToggleStock() {
    setIsInStock((isInStock) => !isInStock);
  }

  return (
    <li className="card">
      <img src={image} alt={name} />
      <h4>{name}</h4>
      <p>Species: {species}</p>
      {isInStock ? (
        <button className="primary" onClick={handleToggleStock}>
          Available for Events
        </button>
      ) : (
        <button onClick={handleToggleStock}>Fully Booked</button>
      )}
    </li>
  );
}

export default BirdCard;
