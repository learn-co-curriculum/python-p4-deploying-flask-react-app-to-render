import BirdCard from "./BirdCard";

function BirdList({ birds }) {
  return (
    <ul className="cards">
      {birds.map((bird) => {
        return <BirdCard key={bird.id} bird={bird} />;
      })}
    </ul>
  );
}

export default BirdList;
