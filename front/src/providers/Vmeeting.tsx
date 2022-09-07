import { createContext, useContext, useEffect, useState } from "react";
import { DUMMY_JWT } from "../libs/constants";
import { Vmeeting } from "../libs/vmeeting";
import { VmeetingMe } from "../libs/vmeeting/user";

const VmeetingContext = createContext<Vmeeting | undefined>(undefined);

export const useVmeeting = () => {
  return useContext(VmeetingContext);
};

interface Props {
  children: React.ReactNode;
}

const VmeetingProvider = ({ children }: Props) => {
  const [vmeeting, setVmeeting] = useState<Vmeeting>();
  useEffect(() => {
    const _vmeeting = new Vmeeting({
      me: new VmeetingMe({ id: "me" }),
      jwt: DUMMY_JWT,
    });

    const init = async () => {
      await _vmeeting.init();
      setVmeeting(_vmeeting);
    };

    init();

    return () => {
      _vmeeting.deconstructor();
    };
  }, []);
  return (
    <VmeetingContext.Provider value={vmeeting}>
      {children}
    </VmeetingContext.Provider>
  );
};

export default VmeetingProvider;
