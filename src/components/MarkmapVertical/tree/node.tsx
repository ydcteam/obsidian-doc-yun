import React from "react";
import styles from "./styles.module.scss";

const Node = ({
	// @ts-expect-error: fine
	nodeDatum,
	// @ts-expect-error: fine
	toggleNode,
	// @ts-expect-error: fine
	foreignObjectProps,
}) => (
	<g>
		<circle r={15} onClick={toggleNode}></circle>
		{/* `foreignObject` requires width & height to be explicitly set. */}
		<foreignObject {...foreignObjectProps}>
			<div
				style={{
					border: "1px solid black",
					backgroundColor: "white",
					borderRadius: "0.25rem",
					wordBreak: "break-word",
				}}
			>
				{/* <h3
                    style={{
                        textAlign: "center",
                        margin: 0,
                        padding: "8% 10%",
                    }}
                >
                    {nodeDatum.name}
                </h3> */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "center",
						textAlign: "center",
						margin: 0,
						overflow: "auto",
					}}
					className={styles.node}
					// eslint-disable-next-line react/no-danger
					dangerouslySetInnerHTML={{ __html: nodeDatum.name }}
				/>
			</div>
		</foreignObject>
	</g>
);

export default Node;
