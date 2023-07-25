import { useEffect, useState } from "preact/hooks";
import { createClientNatsConnection, NatsCon } from "../communication/nats.ts";

// react hook for client nats con
export function useClientNatsCon(): { natsCon: NatsCon | undefined } {
  const [natsCon, setNatsCon] = useState<NatsCon>(undefined);

  // set up the natsConn
  useEffect(() => {
    let localNatsCon: NatsCon | undefined = undefined;

    createClientNatsConnection()
      .then((res) => {
        localNatsCon = res;
        setNatsCon(res);
      })
      .catch((err) => alert(`Cannot connect to NATS: ${err}`));

    return () => {
      console.log("nats con drained");
      localNatsCon?.drain();
    };
  }, []);

  return { natsCon };
}
