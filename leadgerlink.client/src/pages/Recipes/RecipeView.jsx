import React from "react";
import { FaUtensils, FaPencilAlt } from "react-icons/fa";
import DetailViewWithImage from "../Templates/DetailViewWithImage";

/*
  Static Recipe view (sample)
  - Uses the DetailViewWithImage template.
  - Static placeholder values that match the provided mockup.
*/

const RecipeView = () => {
  const headerProps = {
    icon: <FaUtensils size={28} />,
    title: "View Recipe",
    descriptionLines: [],
    actions: [],
  };

  const detail = {
    title: "ID XX: Recipe Name",
    rows: [
      {
        label: "Ingredients",
        value: (
          <ul style={{ margin: 0, paddingLeft: "1rem" }}>
            <li>Chicken breast (grilled): 150g</li>
            <li>Romaine lettuce: 50g</li>
            <li>Caesar dressing: 30g</li>
            <li>Parmesan cheese (shaved): 10g</li>
            <li>Whole wheat tortilla wrap: 1 piece</li>
            <li>Olive oil: 1 tsp</li>
            <li>Salt: 1 pinch</li>
            <li>Black pepper: 1 pinch</li>
          </ul>
        ),
      },
      {
        label: "Instruction",
        value: (
          <ol style={{ margin: 0, paddingLeft: "1rem" }}>
            <li>Grill seasoned chicken until cooked; slice thinly.</li>
            <li>
              Warm tortilla and layer lettuce, chicken, dressing, and Parmesan.
            </li>
            <li>Roll tightly into a wrap and slice.</li>
            <li>Serve warm.</li>
          </ol>
        ),
      },
    ],
  };

  const metadata = {
    title: "About This Recipe",
    rows: [
      { label: "Created At", value: "XX-XX-XXXX" },
      { label: "Created By", value: "XX Employee name" },
      { label: "Updated At", value: "XX-XX-XXXX" },
    ],
  };

  const actions = [
    {
      icon: <FaPencilAlt />,
      title: "Edit Recipe Record",
      route: "/recipes/edit/XX",
    },
  ];

  return (
    <DetailViewWithImage
      headerProps={headerProps}
      detail={detail}
          metadataUnderImage={metadata}
      actions={actions}
    />
  );
};

export default RecipeView;